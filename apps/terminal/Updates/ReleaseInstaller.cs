using System.Diagnostics;
using System.Formats.Tar;
using System.Globalization;
using System.IO.Compression;
using System.Net.Http.Headers;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Contracts;

namespace JobPilot.Terminal.Updates;

/// <summary>A GitHub release, as returned by the releases API (only the fields we read).</summary>
public sealed record GitHubRelease(
    [property: JsonPropertyName("tag_name")] string? TagName,
    [property: JsonPropertyName("assets")] GitHubAsset[]? Assets);

/// <summary>A downloadable asset attached to a GitHub release.</summary>
public sealed record GitHubAsset(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("browser_download_url")] string? DownloadUrl);

/// <summary>How a relaunched child hands off from its predecessor.</summary>
public enum RelaunchMode
{
    /// <summary>Predecessor never bound the port (updater ran before bind); child binds immediately.</summary>
    Startup,

    /// <summary>Predecessor is a running host; child must wait for it to exit before binding (see HostHandoff).</summary>
    Runtime,
}

/// <summary>
/// Archive and filesystem mechanics of a host self-update: talking to the GitHub releases API, picking the
/// newest <c>v*</c> tag, downloading and extracting the per-RID archive, and swapping it over the live
/// install. Knows nothing about when an update should happen - that is <see cref="HostUpdateService"/>.
/// </summary>
internal static class ReleaseInstaller
{
    private const string ReleasesUrl = "https://api.github.com/repos/suxrobGM/jobpilot/releases?per_page=30";

    /// <summary>Tag prefix for the unified host+plugin version line (<c>vX.Y.Z</c>).</summary>
    private const string TagPrefix = "v";

    public static HttpClient CreateClient()
    {
        // Infinite client timeout on purpose: release archives are large, and every call is already bounded
        // by its own CancellationToken. A finite timeout here would abort mid-download.
        var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
        http.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("jobpilot-terminal", HostInstall.HostVersion));
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        return http;
    }

    /// <summary>Fetches the releases list once; null if the payload can't be parsed.</summary>
    public static async Task<GitHubRelease[]?> FetchReleasesAsync(HttpClient http, CancellationToken ct)
    {
        var json = await http.GetStringAsync(ReleasesUrl, ct);
        return JsonSerializer.Deserialize(json, AppJsonContext.Default.GitHubReleaseArray);
    }

    /// <summary>Highest <c>vX.Y.Z</c> release newer than <paramref name="current"/>, or null if up to date.</summary>
    public static (GitHubRelease Release, Version Version)? SelectLatestAbove(GitHubRelease[] releases, Version current)
    {
        GitHubRelease? best = null;
        Version? bestVersion = null;
        foreach (var release in releases)
        {
            if (release.TagName is null || !release.TagName.StartsWith(TagPrefix, StringComparison.Ordinal))
            {
                continue;
            }
            if (!Version.TryParse(release.TagName[TagPrefix.Length..], out var version))
            {
                continue;
            }
            if (bestVersion is null || version > bestVersion)
            {
                bestVersion = version;
                best = release;
            }
        }

        return best is not null && bestVersion is not null && bestVersion > current ? (best, bestVersion) : null;
    }

    /// <summary>Download URL of the current RID's host archive, or null (logged) when the release has none.</summary>
    public static string? ResolveAssetUrl(ILogger logger, (GitHubRelease Release, Version Version) latest)
    {
        var assetName = $"jobpilot-terminal-{CurrentRid()}{(OperatingSystem.IsWindows() ? ".zip" : ".tar.gz")}";
        var asset = latest.Release.Assets?.FirstOrDefault(a => string.Equals(a.Name, assetName, StringComparison.Ordinal));
        if (asset?.DownloadUrl is null)
        {
            logger.LogInformation("Host release {Tag} has no {Asset} asset; skipping.", latest.Release.TagName, assetName);
            return null;
        }
        return asset.DownloadUrl;
    }

    /// <summary>
    /// Downloads/extracts/validates the release into a staging dir, then replaces the install. The running exe
    /// is renamed aside (it cannot be overwritten while executing) and every replaced file is backed up, so a
    /// failure part-way through restores the whole installation rather than just the binary.
    /// </summary>
    public static async Task SwapAsync(HttpClient http, string url, string exePath, string installDir, CancellationToken ct)
    {
        var staging = installDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + ".new";
        DeleteIfExists(staging);
        Directory.CreateDirectory(staging);

        try
        {
            await DownloadAndExtractAsync(http, url, staging, ct);

            var exeName = Path.GetFileName(exePath);
            if (!IsValidHost(staging, exeName))
            {
                throw new InvalidOperationException("Downloaded host failed validation; keeping the current binary.");
            }

            var oldExe = exePath + ".old";
            File.Delete(oldExe); // idempotent; clears a prior swap's leftover before renaming the live exe aside
            File.Move(exePath, oldExe);
            try
            {
                ApplyStaged(staging, installDir);
            }
            catch
            {
                File.Move(oldExe, exePath, overwrite: true); // restore the runnable binary
                throw;
            }

            if (!OperatingSystem.IsWindows())
            {
                File.Delete(oldExe); // Unix can unlink the still-running image; Windows waits for next startup
            }
        }
        finally
        {
            // Always: a staging dir left behind is copied over the install by the *next* swap.
            DeleteIfExists(staging);
        }
    }

    /// <summary>Deletes the renamed-aside binary from a prior swap (the process that held it has exited).</summary>
    public static void CleanupPreviousSwap(ILogger logger)
    {
        if (Environment.ProcessPath is null)
        {
            return;
        }
        try
        {
            File.Delete(Environment.ProcessPath + ".old"); // idempotent no-op when absent
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Could not remove the previous host binary; it will be retried next startup.");
        }
    }

    /// <summary>Launches the swapped-in binary with this process's arguments.</summary>
    public static void Relaunch(string exePath, RelaunchMode mode)
    {
        var psi = new ProcessStartInfo
        {
            FileName = exePath,
            UseShellExecute = false,
            WorkingDirectory = Environment.CurrentDirectory,
        };
        foreach (var arg in Environment.GetCommandLineArgs().Skip(1))
        {
            psi.ArgumentList.Add(arg);
        }
        if (mode == RelaunchMode.Runtime)
        {
            // We still hold :4102: hand the child our pid so it waits for us to exit before binding.
            psi.Environment[HostHandoff.AwaitPidVar] = Environment.ProcessId.ToString(CultureInfo.InvariantCulture);
        }
        Process.Start(psi);
    }

    /// <summary>Downloads the asset to a temp file and extracts it into <paramref name="destDir"/>, choosing zip or gzip+tar by extension.</summary>
    public static async Task DownloadAndExtractAsync(HttpClient http, string url, string destDir, CancellationToken ct)
    {
        var archive = Path.GetTempFileName();
        try
        {
            await using (var download = await http.GetStreamAsync(url, ct))
            await using (var file = File.Create(archive))
            {
                await download.CopyToAsync(file, ct);
            }

            if (url.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                ZipFile.ExtractToDirectory(archive, destDir, overwriteFiles: true);
            }
            else
            {
                await using var file = File.OpenRead(archive);
                await using var gzip = new GZipStream(file, CompressionMode.Decompress);
                TarFile.ExtractToDirectory(gzip, destDir, overwriteFiles: true);
            }
        }
        finally
        {
            File.Delete(archive);
        }
    }

    public static void DeleteIfExists(string dir)
    {
        if (Directory.Exists(dir))
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    /// <summary>An archive is only a host if it carries the binary and the plugin tree the host resolves at runtime.</summary>
    internal static bool IsValidHost(string dir, string exeName)
    {
        return File.Exists(Path.Combine(dir, exeName))
            && File.Exists(Path.Combine(dir, "plugin", ".claude-plugin", "plugin.json"));
    }

    /// <summary>
    /// Copies every staged file over the install, remembering what it replaced and what it created. A failure
    /// half-way used to leave the plugin tree partly upgraded even though the exe was restored; now the whole
    /// installation is rolled back.
    /// </summary>
    internal static void ApplyStaged(string stagingDir, string installDir)
    {
        var backupDir = installDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + ".bak";
        DeleteIfExists(backupDir);
        Directory.CreateDirectory(backupDir);

        var replaced = new List<(string Target, string Backup)>();
        var created = new List<string>();

        try
        {
            foreach (var file in Directory.GetFiles(stagingDir, "*", SearchOption.AllDirectories))
            {
                var relative = Path.GetRelativePath(stagingDir, file);
                var target = Path.Combine(installDir, relative);
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);

                if (File.Exists(target))
                {
                    var backup = Path.Combine(backupDir, relative);
                    Directory.CreateDirectory(Path.GetDirectoryName(backup)!);
                    File.Copy(target, backup, overwrite: true);
                    replaced.Add((target, backup));
                }
                else
                {
                    created.Add(target);
                }

                File.Copy(file, target, overwrite: true);
            }
        }
        catch
        {
            Rollback(replaced, created);
            throw;
        }
        finally
        {
            try
            {
                DeleteIfExists(backupDir);
            }
            catch (IOException)
            {
                // The install is consistent; a stray .bak dir is cleaned by the next swap.
            }
        }
    }

    private static void Rollback(List<(string Target, string Backup)> replaced, List<string> created)
    {
        foreach (var (target, backup) in replaced)
        {
            try
            {
                File.Copy(backup, target, overwrite: true);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                // Best effort: keep restoring the rest rather than abandoning the install mid-rollback.
            }
        }

        foreach (var target in created)
        {
            try
            {
                File.Delete(target);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
            }
        }
    }

    private static string CurrentRid()
    {
        var os = OperatingSystem.IsWindows() ? "win" : OperatingSystem.IsMacOS() ? "osx" : "linux";
        var arch = RuntimeInformation.OSArchitecture switch
        {
            Architecture.X64 => "x64",
            Architecture.Arm64 => "arm64",
            _ => throw new PlatformNotSupportedException($"Unsupported architecture: {RuntimeInformation.OSArchitecture}"),
        };
        return $"{os}-{arch}";
    }
}
