using JobPilot.Terminal.Models;
using JobPilot.Terminal.Sessions;

namespace JobPilot.Terminal.Plugins;

/// <summary>Dashboard-triggered runtime self-update (<c>POST /update</c>): dev-checkout guard (caller-supplied),
/// single-flight gate, and releases fetch, then delegates the swap+relaunch to <see cref="HostUpdater.UpdateNowAsync"/>.</summary>
public static class RuntimeUpdater
{
    // Single-flight: a second POST /update while one is in flight returns "in-progress" instead of racing two swaps.
    private static readonly SemaphoreSlim Gate = new(1, 1);

    public static async Task<UpdateResult> RunAsync(ILogger logger, bool canUpdate, CancellationToken ct)
    {
        var current = SessionManager.HostVersion;

        if (!canUpdate)
        {
            return new UpdateResult { Updating = false, FromVersion = current, Reason = "dev-checkout" };
        }

        if (!Gate.Wait(0, ct))
        {
            return new UpdateResult { Updating = false, FromVersion = current, Reason = "in-progress" };
        }

        var releaseGate = true;
        try
        {
            using var http = ReleaseUpdates.CreateClient();
            var releases = await ReleaseUpdates.FetchReleasesAsync(http, ct)
                ?? throw new InvalidOperationException("Could not read the GitHub releases list.");

            var result = await HostUpdater.UpdateNowAsync(logger, http, releases, ct);
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
                Gate.Release();
            }
        }
    }
}
