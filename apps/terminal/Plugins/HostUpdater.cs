using System.Diagnostics;
using System.Runtime.InteropServices;
using JobPilot.Terminal.Models;
using JobPilot.Terminal.Sessions;

namespace JobPilot.Terminal.Plugins;

/// <summary>
/// Self-updates the host binary from the latest <c>v*</c> release at startup, then relaunches into the
/// new build (before the server binds). No-ops on any failure. Pairs with <see cref="PluginUpdater"/>
/// (binary vs plugin tree); the caller supplies the shared releases list and does the dev-checkout guard.
/// </summary>
public static class HostUpdater
{
    /// <summary>
    /// Cleans up a prior swap, then updates if a newer release exists. Returns true when it applied an
    /// update and launched the replacement (caller should exit without binding). Swallows all failures.
    /// </summary>
    public static async Task<bool> TryUpdateAsync(ILogger logger, HttpClient http, GitHubRelease[] releases, CancellationToken ct)
    {
        try
        {
            CleanupPreviousSwap(logger);
            return await UpdateAsync(logger, http, releases, ct);
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Host auto-update skipped; keeping the current binary.");
            return false;
        }
    }

    private static async Task<bool> UpdateAsync(ILogger logger, HttpClient http, GitHubRelease[] releases, CancellationToken ct)
    {
        var exePath = Environment.ProcessPath;
        if (exePath is null)
        {
            return false;
        }
        var installDir = Path.GetDirectoryName(exePath)!;

        var current = Version.Parse(SessionManager.HostVersion);
        var latest = ReleaseUpdates.SelectLatestAbove(releases, current);
        if (latest is null)
        {
            logger.LogInformation("Host is up to date (v{Current}).", current);
            return false;
        }

        var assetName = $"jobpilot-terminal-{CurrentRid()}{(OperatingSystem.IsWindows() ? ".zip" : ".tar.gz")}";
        var asset = latest.Value.Release.Assets?.FirstOrDefault(a => string.Equals(a.Name, assetName, StringComparison.Ordinal));
        if (asset?.DownloadUrl is null)
        {
            logger.LogInformation("Host release {Tag} has no {Asset} asset; skipping.", latest.Value.Release.TagName, assetName);
            return false;
        }

        logger.LogInformation("Updating host v{Current} -> v{Next}.", current, latest.Value.Version);
        await SwapAsync(http, asset.DownloadUrl, exePath, installDir, ct);
        Relaunch(exePath);
        logger.LogInformation("Host updated to v{Next}; relaunching.", latest.Value.Version);
        return true;
    }

    /// <summary>
    /// Downloads/extracts/validates the release into a staging dir, then replaces the install. The running
    /// exe is renamed aside (can't be overwritten while executing) and restored on failure - never bricked.
    /// </summary>
    private static async Task SwapAsync(HttpClient http, string url, string exePath, string installDir, CancellationToken ct)
    {
        var staging = installDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + ".new";
        ReleaseUpdates.DeleteIfExists(staging);
        Directory.CreateDirectory(staging);

        await ReleaseUpdates.DownloadAndExtractAsync(http, url, staging, ct);

        var exeName = Path.GetFileName(exePath);
        if (!IsValidHost(staging, exeName))
        {
            ReleaseUpdates.DeleteIfExists(staging);
            throw new InvalidOperationException("Downloaded host failed validation; keeping the current binary.");
        }

        var oldExe = exePath + ".old";
        File.Delete(oldExe); // idempotent; clears a prior swap's leftover before renaming the live exe aside
        File.Move(exePath, oldExe);
        try
        {
            CopyOverwrite(staging, installDir);
        }
        catch
        {
            File.Move(oldExe, exePath, overwrite: true); // restore the runnable binary
            throw;
        }
        ReleaseUpdates.DeleteIfExists(staging);
        if (!OperatingSystem.IsWindows())
        {
            File.Delete(oldExe); // Unix can unlink the still-running image; Windows waits for next startup
        }
    }

    /// <summary>Deletes the renamed-aside binary from a prior swap (the process that held it has exited).</summary>
    private static void CleanupPreviousSwap(ILogger logger)
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

    private static void Relaunch(string exePath)
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
        Process.Start(psi);
    }

    private static bool IsValidHost(string dir, string exeName)
    {
        return File.Exists(Path.Combine(dir, exeName))
            && File.Exists(Path.Combine(dir, "plugin", ".claude-plugin", "plugin.json"));
    }

    /// <summary>Copies every file under <paramref name="sourceDir"/> into <paramref name="destDir"/>, overwriting.</summary>
    private static void CopyOverwrite(string sourceDir, string destDir)
    {
        foreach (var file in Directory.GetFiles(sourceDir, "*", SearchOption.AllDirectories))
        {
            var target = Path.Combine(destDir, Path.GetRelativePath(sourceDir, file));
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.Copy(file, target, overwrite: true);
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
