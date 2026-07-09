using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Contracts;

namespace JobPilot.Terminal.Updates;

/// <summary>
/// Decides when the host self-updates and hands the mechanics to <see cref="ReleaseInstaller"/>. Two entry
/// points: <see cref="UpdateAtStartupAsync"/> runs before the port is bound and swallows every failure;
/// <see cref="UpdateNowAsync"/> serves <c>POST /update</c> and lets failures surface to the caller.
/// </summary>
public sealed class HostUpdateService(ILogger<HostUpdateService> logger, HostInstall install)
{
    private static readonly TimeSpan StartupTimeout = TimeSpan.FromSeconds(20);

    /// <summary>Single-flight: a second POST /update while one is in flight reports "in-progress" rather than
    /// racing two swaps over the same install directory.</summary>
    private readonly SemaphoreSlim gate = new(1, 1);

    /// <summary>
    /// Updates before the server binds, so no session can spawn mid-swap. Returns true when the host swapped
    /// and launched its replacement - the caller must exit without binding. No-ops in a dev checkout or offline.
    /// </summary>
    public async Task<bool> UpdateAtStartupAsync()
    {
        try
        {
            if (!install.CanUpdate)
            {
                logger.LogInformation("Not a published install (dev checkout); skipping auto-update.");
                return false;
            }

            using var http = ReleaseInstaller.CreateClient();
            using var cts = new CancellationTokenSource(StartupTimeout);

            var releases = await ReleaseInstaller.FetchReleasesAsync(http, cts.Token);
            if (releases is null)
            {
                return false;
            }

            ReleaseInstaller.CleanupPreviousSwap(logger);
            var result = await ApplyLatestAsync(http, releases, RelaunchMode.Startup, cts.Token);
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

    /// <summary>
    /// Dashboard-triggered update: swaps the binary and relaunches a detached child that waits for this
    /// process to exit before binding. The caller then shuts down to hand off the port.
    /// </summary>
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
            using var http = ReleaseInstaller.CreateClient();
            var releases = await ReleaseInstaller.FetchReleasesAsync(http, ct)
                ?? throw new InvalidOperationException("Could not read the GitHub releases list.");

            ReleaseInstaller.CleanupPreviousSwap(logger);
            var result = await ApplyLatestAsync(http, releases, RelaunchMode.Runtime, ct);
            if (result.Updating)
            {
                releaseGate = false; // keep the gate held; we're relaunching + shutting down
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
    private async Task<UpdateResult> ApplyLatestAsync(HttpClient http, GitHubRelease[] releases, RelaunchMode mode, CancellationToken ct)
    {
        var exePath = Environment.ProcessPath
            ?? throw new InvalidOperationException("Cannot resolve the host executable path.");

        var current = Version.Parse(HostInstall.HostVersion);
        var latest = ReleaseInstaller.SelectLatestAbove(releases, current);
        if (latest is null)
        {
            logger.LogInformation("Host is up to date (v{Current}).", current);
            return NotUpdating(current.ToString(3), UpdateResult.ReasonUpToDate);
        }

        var downloadUrl = ReleaseInstaller.ResolveAssetUrl(logger, latest.Value);
        if (downloadUrl is null)
        {
            return NotUpdating(current.ToString(3), UpdateResult.ReasonNoAsset);
        }

        logger.LogInformation("Updating host v{Current} -> v{Next} ({Mode}).", current, latest.Value.Version, mode);
        await ReleaseInstaller.SwapAsync(http, downloadUrl, exePath, Path.GetDirectoryName(exePath)!, ct);
        ReleaseInstaller.Relaunch(exePath, mode);

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
