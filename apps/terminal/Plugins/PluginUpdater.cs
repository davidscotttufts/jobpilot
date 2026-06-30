using System.Formats.Tar;
using System.IO.Compression;
using System.Net.Http.Headers;
using System.Text.Json;
using JobPilot.Terminal.Models;
using JobPilot.Terminal.Sessions;

namespace JobPilot.Terminal.Plugins;

/// <summary>
/// Keeps the active plugin/ tree current by downloading the latest <c>plugin/v*</c> release at
/// startup. No-ops in a dev checkout (never overwrites the source tree) and on any network, parse,
/// or filesystem failure (the bundled copy stays in place), so it is always safe to call.
/// </summary>
public static class PluginUpdater
{
    private const string ReleasesUrl = "https://api.github.com/repos/suxrobGM/jobpilot/releases?per_page=30";
    private const string TagPrefix = "plugin/v";
    private const string AssetName = "jobpilot-plugin.tar.gz";

    /// <summary>
    /// Updates the bundled plugin to the latest release if a newer one exists, swallowing all
    /// failures (the bundled plugin remains usable).
    /// </summary>
    public static async Task TryUpdateAsync(ILogger logger, TimeSpan timeout)
    {
        try
        {
            using var cts = new CancellationTokenSource(timeout);
            await UpdateAsync(logger, cts.Token);
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Plugin auto-update skipped; using the bundled plugin.");
        }
    }

    private static async Task UpdateAsync(ILogger logger, CancellationToken ct)
    {
        var pluginDir = TerminalSessionPaths.Resolve().ClaudePluginDir;

        if (!IsPublishedInstall(pluginDir))
        {
            logger.LogInformation("Not a published install (dev checkout); skipping plugin auto-update.");
            return;
        }

        var current = ReadVersion(Path.Combine(pluginDir, ".claude-plugin", "plugin.json"));
        if (current is null)
        {
            logger.LogInformation("Could not read the installed plugin version; skipping auto-update.");
            return;
        }

        using var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
        http.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("jobpilot-terminal", SessionManager.HostVersion));
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        var releasesJson = await http.GetStringAsync(ReleasesUrl, ct);
        var releases = JsonSerializer.Deserialize(releasesJson, AppJsonContext.Default.GitHubReleaseArray);
        if (releases is null)
        {
            return;
        }

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

        if (best is null || bestVersion is null || bestVersion <= current)
        {
            logger.LogInformation("Plugin is up to date (v{Current}).", current);
            return;
        }

        var asset = best.Assets?.FirstOrDefault(a => string.Equals(a.Name, AssetName, StringComparison.Ordinal));
        if (asset?.DownloadUrl is null)
        {
            logger.LogInformation("Plugin release {Tag} has no {Asset} asset; skipping.", best.TagName, AssetName);
            return;
        }

        logger.LogInformation("Updating plugin v{Current} -> v{Next}.", current, bestVersion);
        await SwapAsync(http, asset.DownloadUrl, pluginDir, ct);
        logger.LogInformation("Plugin updated to v{Next}.", bestVersion);
    }

    /// <summary>
    /// Downloads and extracts the plugin tarball into a staging dir, validates it, then swaps it into
    /// place via two directory moves so the live plugin dir is never left partial.
    /// </summary>
    private static async Task SwapAsync(HttpClient http, string url, string pluginDir, CancellationToken ct)
    {
        var staging = pluginDir + ".new";
        var backup = pluginDir + ".old";
        DeleteIfExists(staging);
        Directory.CreateDirectory(staging);

        var tarball = Path.GetTempFileName();
        try
        {
            await using (var download = await http.GetStreamAsync(url, ct))
            await using (var file = File.Create(tarball))
            {
                await download.CopyToAsync(file, ct);
            }

            await using (var file = File.OpenRead(tarball))
            await using (var gzip = new GZipStream(file, CompressionMode.Decompress))
            {
                TarFile.ExtractToDirectory(gzip, staging, overwriteFiles: true);
            }
        }
        finally
        {
            File.Delete(tarball);
        }

        if (!IsValidPlugin(staging))
        {
            DeleteIfExists(staging);
            throw new InvalidOperationException("Downloaded plugin failed validation; keeping the bundled copy.");
        }

        DeleteIfExists(backup);
        Directory.Move(pluginDir, backup);
        try
        {
            Directory.Move(staging, pluginDir);
        }
        catch
        {
            Directory.Move(backup, pluginDir); // roll back to the previous plugin
            throw;
        }
        Directory.Delete(backup, recursive: true);
    }

    private static bool IsValidPlugin(string dir)
    {
        return File.Exists(Path.Combine(dir, ".claude-plugin", "plugin.json"))
            && File.Exists(Path.Combine(dir, ".codex-plugin", "plugin.json"))
            && File.Exists(Path.Combine(dir, "skills", "shared", "setup.md"));
    }

    private static void DeleteIfExists(string dir)
    {
        if (Directory.Exists(dir))
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    /// <summary>
    /// True when the plugin sits next to the published binary (under <see cref="AppContext.BaseDirectory"/>).
    /// A dev checkout resolves the plugin to the repo root instead, so keying on this both targets real
    /// installs and never overwrites a source tree — without the false positives of a ".git ancestor"
    /// heuristic (which would also fire for an install path that merely lives under any git working tree).
    /// </summary>
    private static bool IsPublishedInstall(string pluginDir)
    {
        var baseDir = Path.GetFullPath(AppContext.BaseDirectory);
        return Path.GetFullPath(pluginDir).StartsWith(baseDir, StringComparison.OrdinalIgnoreCase);
    }

    private static Version? ReadVersion(string manifestPath)
    {
        try
        {
            if (!File.Exists(manifestPath))
            {
                return null;
            }
            var manifest = JsonSerializer.Deserialize(File.ReadAllText(manifestPath), AppJsonContext.Default.PluginManifest);
            return manifest?.Version is { } value && Version.TryParse(value, out var parsed) ? parsed : null;
        }
        catch
        {
            return null;
        }
    }
}
