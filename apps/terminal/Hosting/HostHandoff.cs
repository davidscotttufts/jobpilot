using System.Diagnostics;

namespace JobPilot.Terminal.Hosting;

/// <summary>Port handoff for a runtime self-update relaunch: the parent (post-swap) releases :4102 after
/// answering the request, and the child waits for the predecessor (<c>JOBPILOT_AWAIT_PID</c>) to exit
/// before binding, so it never races the parent for the port.</summary>
public static class HostHandoff
{
    /// <summary>Env var carrying the predecessor pid on a runtime self-update relaunch; its presence marks the relaunch.</summary>
    public const string AwaitPidVar = "JOBPILOT_AWAIT_PID";

    private static readonly TimeSpan MaxWait = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan Poll = TimeSpan.FromMilliseconds(150);
    private static readonly TimeSpan SocketDrain = TimeSpan.FromMilliseconds(300);
    private static readonly TimeSpan ResponseFlush = TimeSpan.FromMilliseconds(500);

    /// <summary>True when a runtime self-update relaunched us, so we're already latest and skip the startup update.</summary>
    public static bool IsUpdateRelaunch => Environment.GetEnvironmentVariable(AwaitPidVar) is not null;

    /// <summary>Parent side: after a runtime update swaps+relaunches, stop the app (releasing :4102) once the
    /// HTTP response has flushed, so the waiting child can bind.</summary>
    public static void BeginRelease(IHostApplicationLifetime lifetime, CancellationToken ct)
    {
        _ = Task.Run(async () =>
        {
            await Task.Delay(ResponseFlush, ct);
            lifetime.StopApplication(); // -> ApplicationStopping -> SessionManager.Stop() -> exit
        }, ct);
    }

    /// <summary>Blocks until the predecessor pid in <c>JOBPILOT_AWAIT_PID</c> exits (bounded), so the port frees up.</summary>
    public static async Task WaitForParentExitAsync(ILogger logger)
    {
        var raw = Environment.GetEnvironmentVariable(AwaitPidVar);
        // Clear it up front so it can't leak into a future relaunch spawned by this process.
        Environment.SetEnvironmentVariable(AwaitPidVar, null);
        if (!int.TryParse(raw, out var pid))
        {
            return;
        }

        logger.LogInformation("Waiting for previous host (pid {Pid}) to exit before binding.", pid);
        var deadline = DateTime.UtcNow + MaxWait;
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                using var previous = Process.GetProcessById(pid);
                if (previous.HasExited)
                {
                    break;
                }
            }
            catch (ArgumentException)
            {
                break; // process already gone
            }
            await Task.Delay(Poll);
        }

        // Small grace so the OS fully releases the listen socket after the process exits.
        await Task.Delay(SocketDrain);
    }
}
