using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Contracts;

namespace JobPilot.Terminal.Updates;

/// <summary>Coordinates startup and dashboard-triggered host updates.</summary>
public sealed class HostUpdateService(
    ILogger<HostUpdateService> logger,
    HostInstall install,
    GitHubReleaseClient releases,
    ReleaseInstaller installer)
{
    private static readonly TimeSpan StartupTimeout = TimeSpan.FromSeconds(20);

    /// <summary>Prevents concurrent swaps of the install directory.</summary>
    private readonly SemaphoreSlim gate = new(1, 1);

    /// <summary>Updates before binding. Returns true when a replacement was launched.</summary>
    public async Task<bool> UpdateAtStartupAsync()
    {
        try
        {
            if (!install.CanUpdate)
            {
                logger.LogInformation("Not a published install (dev checkout); skipping auto-update.");
                return false;
            }

            using var cts = new CancellationTokenSource(StartupTimeout);

            var available = await releases.FetchReleasesAsync(cts.Token);
            if (available is null)
            {
                return false;
            }

            installer.CleanupPreviousSwap();
            var result = await ApplyLatestAsync(available, RelaunchMode.Startup, cts.Token);
            if (result.Updating)
            {
                logger.LogInformation("Host updated to v{Next}; relaunching.", result.ToVersion);
            }
            return result.Updating;
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Auto-update skipped; keeping the current install.");
            return false;
        }
    }

    /// <summary>Updates a running host and launches its handoff process.</summary>
    public async Task<UpdateResult> UpdateNowAsync(CancellationToken ct)
    {
        var current = HostInstall.HostVersion;

        if (!install.CanUpdate)
        {
            return NotUpdating(current, UpdateResult.ReasonDevCheckout);
        }

        if (!gate.Wait(0, ct))
        {
            return NotUpdating(current, UpdateResult.ReasonInProgress);
        }

        var releaseGate = true;
        try
        {
            var available = await releases.FetchReleasesAsync(ct)
                ?? throw new InvalidOperationException("Could not read the GitHub releases list.");

            installer.CleanupPreviousSwap();
            var result = await ApplyLatestAsync(available, RelaunchMode.Runtime, ct);
            if (result.Updating)
            {
                releaseGate = false; // The process is shutting down; no second swap may start.
            }
            return result;
        }
        finally
        {
            if (releaseGate)
            {
                gate.Release();
            }
        }
    }

    /// <summary>Swaps in the newest release above the running version, then relaunches into it.</summary>
    private async Task<UpdateResult> ApplyLatestAsync(GitHubRelease[] available, RelaunchMode mode, CancellationToken ct)
    {
        var exePath = Environment.ProcessPath
            ?? throw new InvalidOperationException("Cannot resolve the host executable path.");

        var current = Version.Parse(HostInstall.HostVersion);
        var latest = GitHubReleaseClient.SelectLatestAbove(available, current);
        if (latest is null)
        {
            logger.LogInformation("Host is up to date (v{Current}).", current);
            return NotUpdating(current.ToString(3), UpdateResult.ReasonUpToDate);
        }

        var downloadUrl = releases.ResolveAssetUrl(latest.Value);
        if (downloadUrl is null)
        {
            return NotUpdating(current.ToString(3), UpdateResult.ReasonNoAsset);
        }

        logger.LogInformation("Updating host v{Current} -> v{Next} ({Mode}).", current, latest.Value.Version, mode);
        await installer.SwapAsync(downloadUrl, exePath, Path.GetDirectoryName(exePath)!, ct);
        installer.Relaunch(exePath, mode);

        return new UpdateResult
        {
            Updating = true,
            FromVersion = current.ToString(3),
            ToVersion = latest.Value.Version.ToString(3),
        };
    }

    private static UpdateResult NotUpdating(string current, string reason) =>
        new() { Updating = false, FromVersion = current, Reason = reason };
}
