using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Models;
using JobPilot.Terminal.Sessions;

namespace JobPilot.Terminal.Plugins;

/// <summary>How a relaunched child hands off from its predecessor.</summary>
public enum RelaunchMode
{
    /// <summary>Predecessor never bound the port (updater ran before bind); child binds immediately.</summary>
    Startup,

    /// <summary>Predecessor is a running host; child must wait for it to exit before binding (see HostHandoff).</summary>
    Runtime,
}

/// <summary>
/// Self-updates the host binary from the latest <c>v*</c> release and relaunches into it (the archive bundles
/// the plugin tree, so the swap refreshes skills too). Two entry points: <see cref="TryUpdateAsync"/> (startup,
/// swallows failures) and <see cref="UpdateNowAsync"/> (runtime, propagates failures for the endpoint to report).
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

        var current = Version.Parse(SessionManager.HostVersion);
        var latest = ReleaseUpdates.SelectLatestAbove(releases, current);
        if (latest is null)
        {
            logger.LogInformation("Host is up to date (v{Current}).", current);
            return false;
        }

        var downloadUrl = ResolveAssetUrl(logger, latest.Value);
        if (downloadUrl is null)
        {
            return false;
        }

        logger.LogInformation("Updating host v{Current} -> v{Next}.", current, latest.Value.Version);
        await SwapAsync(http, downloadUrl, exePath, Path.GetDirectoryName(exePath)!, ct);
        Relaunch(exePath, RelaunchMode.Startup);
        logger.LogInformation("Host updated to v{Next}; relaunching.", latest.Value.Version);
        return true;
    }

    /// <summary>
    /// Runtime self-update: swaps the binary and relaunches a detached child that waits for this process to exit
    /// before binding (the caller then shuts down to hand off the port). Returns a non-updating result when
    /// there's nothing to do; lets failures propagate so the endpoint can report them.
    /// </summary>
    public static async Task<UpdateResult> UpdateNowAsync(ILogger logger, HttpClient http, GitHubRelease[] releases, CancellationToken ct)
    {
        CleanupPreviousSwap(logger);

        var exePath = Environment.ProcessPath
            ?? throw new InvalidOperationException("Cannot resolve the host executable path.");

        var current = Version.Parse(SessionManager.HostVersion);
        var latest = ReleaseUpdates.SelectLatestAbove(releases, current);
        if (latest is null)
        {
            return new UpdateResult { Updating = false, FromVersion = current.ToString(3), Reason = "up-to-date" };
        }

        var downloadUrl = ResolveAssetUrl(logger, latest.Value);
        if (downloadUrl is null)
        {
            return new UpdateResult { Updating = false, FromVersion = current.ToString(3), Reason = "no-asset" };
        }

        logger.LogInformation("Runtime update host v{Current} -> v{Next}; relaunching and handing off port.", current, latest.Value.Version);
        await SwapAsync(http, downloadUrl, exePath, Path.GetDirectoryName(exePath)!, ct);
        Relaunch(exePath, RelaunchMode.Runtime);
        return new UpdateResult
        {
            Updating = true,
            FromVersion = current.ToString(3),
            ToVersion = latest.Value.Version.ToString(3),
        };
    }

    /// <summary>Download URL of the current RID's host archive in <paramref name="latest"/>, or null (logged) when absent.</summary>
    private static string? ResolveAssetUrl(ILogger logger, (GitHubRelease Release, Version Version) latest)
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

    private static void Relaunch(string exePath, RelaunchMode mode)
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
