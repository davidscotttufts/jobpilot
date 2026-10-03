using System.Globalization;

namespace JobPilot.Terminal.Pilot;

public enum CycleStatus
{
    Ok,
    Empty,
    Error,
}

/// <summary>
/// Runs one cycle: refresh the task list, start a run for its top task, hand that run to the agent, and record the
/// cycle. A stuck run climbs check-in, skip, then restart. It returns the inter-cycle sleep instead of sleeping, so
/// the loop can cut the sleep short on a wake.
/// </summary>
/// <param name="checkInterval">Tests pass one at least as long as every wait, so each wait is a single slice.</param>
internal sealed class CycleRunner(IPilotSession session, TimeSpan? checkInterval = null)
{
    public const int MinSleepSeconds = 15;
    public const int MaxSleepSeconds = 21600;

    // Server-side activity newer than this means the run is working, not stuck.
    public static readonly TimeSpan ActiveWindow = TimeSpan.FromMinutes(5);

    private static readonly TimeSpan ResultTimeout = TimeSpan.FromMinutes(20);
    private static readonly TimeSpan CheckInGrace = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan BackoffDelay = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan StartupGrace = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan MismatchPoll = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan RefreshRetry = TimeSpan.FromMinutes(1);

    // A run that keeps showing activity still hands over to the ladder after this long.
    private static readonly TimeSpan MaxCycleWait = TimeSpan.FromMinutes(60);

    // Back off only after this many restarts or exits in a row, so a broken install cannot hot-loop.
    private const int BackoffThreshold = 3;

    // How often a wait asks the server whether the run finished, in case its event was missed.
    private readonly TimeSpan checkInterval = checkInterval ?? TimeSpan.FromMinutes(2);

    private TimeSpan totalWaited;
    private bool extensionReported;

    /// <summary>Reset by any run that posts its result.</summary>
    public int ConsecutiveRestarts { get; private set; }

    /// <summary>Sessions that died on their own mid-wait; reset by any run that posts its result.</summary>
    public int ConsecutiveExits { get; private set; }

    public DateTimeOffset? LastCycleAt { get; private set; }

    public CycleStatus? LastCycleStatus { get; private set; }

    /// <summary>False while paused because the user runs the other provider.</summary>
    public bool Conducting { get; private set; }

    /// <summary>The rest of the last inter-cycle break, so a host restart does not skip it.</summary>
    public static TimeSpan OwedBreak(PilotActivity? activity, DateTimeOffset now)
    {
        if (activity?.LastCycle is not { } last)
        {
            return TimeSpan.Zero;
        }

        var planned = TimeSpan.FromSeconds(ClampSleep(last.SleepSeconds ?? MinSleepSeconds));
        var remaining = planned - (now - last.CompletedAt);
        if (remaining <= TimeSpan.Zero)
        {
            return TimeSpan.Zero;
        }

        return remaining > planned ? planned : remaining;
    }

    /// <summary>Returns the sleep before the next cycle, or null to go again right away.</summary>
    public async Task<TimeSpan?> RunAsync(PilotSettings settings, CancellationToken ct)
    {
        // Never fight a user who launched the other provider by hand: pause instead of killing their session.
        var running = session.RunningProvider;
        if (running is not null && running != settings.Provider)
        {
            Conducting = false;
            await session.DelayAsync(MismatchPoll, ct);
            return null;
        }

        Conducting = true;

        // Only a cycle with work wakes the model, so an idle pilot spends no tokens and needs no session.
        // A stopped pilot also fails the refresh; its stop event ends the retry sleep.
        var taskList = await session.RefreshTasksAsync(ct);
        if (taskList is null)
        {
            return RefreshRetry;
        }

        if (taskList.Tasks.Length == 0)
        {
            return await FinishEmptyAsync(taskList, ct);
        }

        // The server's ranking is final, so the top task is the one to run.
        var task = taskList.Tasks[0];
        var runId = await session.StartRunAsync(task.Id, taskList.Version, ct);
        if (runId is null)
        {
            // A lost race or the duplicate-apply guard; the next refresh moves past it.
            return TimeSpan.FromSeconds(MinSleepSeconds);
        }

        if (running is null)
        {
            session.Start(settings);
            await session.DelayAsync(StartupGrace, ct);
        }

        totalWaited = TimeSpan.Zero;
        extensionReported = false;

        await session.SendCycleAsync(settings, runId, ct);
        var result = await WaitToFinishAsync(runId, ResultTimeout, ct);
        if (result.Outcome is not (WaitOutcome.Finished or WaitOutcome.SessionExited))
        {
            result = await ClimbLadderAsync(settings, runId, ct);
        }

        // Usage before the cycle entry, which observers treat as the end of the cycle.
        var tokens = await session.ReportUsageAsync(runId, ct);
        return await RecordRunAsync(task, runId, taskList, result, tokens, ct);
    }

    private async Task<TimeSpan?> FinishEmptyAsync(PilotTaskList taskList, CancellationToken ct)
    {
        var sleep = ClampSleep(taskList.SleepSeconds);
        var wake = taskList.NextWakeAt.ToLocalTime().ToString("HH:mm", CultureInfo.InvariantCulture);
        await session.JournalCycleAsync(null, $"All caught up - nothing needs doing; checking back at {wake}.", new CycleDetail("empty", sleep), ct);
        LastCycleAt = DateTimeOffset.UtcNow;
        LastCycleStatus = CycleStatus.Empty;
        return TimeSpan.FromSeconds(sleep);
    }

    /// <summary>Journals the cycle. A run the agent never finished is failed here, so it does not hold its task.</summary>
    private async Task<TimeSpan?> RecordRunAsync(
        PilotTaskStub task, string runId, PilotTaskList taskList, WaitResult result, long? tokens, CancellationToken ct)
    {
        var posted = result.Outcome is WaitOutcome.Finished;
        if (!posted)
        {
            await session.FailRunAsync(runId, ct);
        }

        var ok = posted && result.RunOutcome == "done";
        var sleep = ClampSleep(taskList.SleepSeconds);
        var ending = posted ? result.RunOutcome : "no result, failed by the host";
        var detail = new CycleDetail(ok ? "ok" : "error", sleep, task.TaskType, tokens);
        await session.JournalCycleAsync(runId, $"{task.Title} - {ending}.", detail, ct);

        LastCycleAt = DateTimeOffset.UtcNow;
        LastCycleStatus = ok ? CycleStatus.Ok : CycleStatus.Error;
        return posted ? TimeSpan.FromSeconds(sleep) : null;
    }

    private async Task<WaitResult> ClimbLadderAsync(PilotSettings settings, string runId, CancellationToken ct)
    {
        // No server check between rungs: every unfinished wait has just checked whether the run finished.
        (Directive Directive, string Report)[] rungs = [(Directive.CheckIn, Reports.CheckIn), (Directive.Skip, Reports.Skip)];
        foreach (var (directive, report) in rungs)
        {
            await session.ReportAsync(report, ct);
            await session.SendDirectiveAsync(settings, directive, ct);
            var result = await WaitToFinishAsync(runId, CheckInGrace, ct);
            if (result.Outcome is WaitOutcome.Finished or WaitOutcome.SessionExited)
            {
                return result;
            }
        }

        ConsecutiveRestarts++;
        await session.ReportAsync(Reports.Restart, ct);
        session.Stop();
        if (ConsecutiveRestarts >= BackoffThreshold)
        {
            await session.ReportAsync(Reports.Backoff, ct);
            await session.DelayAsync(BackoffDelay, ct);
        }

        return WaitResult.Timeout;
    }

    private async Task<WaitResult> WaitToFinishAsync(string runId, TimeSpan quietBudget, CancellationToken ct)
    {
        var result = await WaitAsync(runId, quietBudget, ct);
        if (result.Outcome is WaitOutcome.Finished)
        {
            ConsecutiveRestarts = 0;
            ConsecutiveExits = 0;
        }
        else if (result.Outcome is WaitOutcome.SessionExited)
        {
            // The next cycle restarts the session, but a CLI that keeps dying at startup (broken install or sign-in)
            // backs off instead of restarting every few seconds.
            ConsecutiveExits++;
            if (ConsecutiveExits >= BackoffThreshold)
            {
                await session.ReportAsync(Reports.ExitBackoff, ct);
                await session.DelayAsync(BackoffDelay, ct);
                ConsecutiveExits = 0;
            }
        }

        return result;
    }

    /// <summary>
    /// Waits in slices, checking the server after each. A finished run ends the wait and fresh activity extends it,
    /// up to <see cref="MaxCycleWait"/> per cycle; otherwise it returns after the quiet budget or a stuck signal.
    /// </summary>
    private async Task<WaitResult> WaitAsync(string runId, TimeSpan quietBudget, CancellationToken ct)
    {
        var slice = checkInterval < quietBudget ? checkInterval : quietBudget;
        var quiet = TimeSpan.Zero;

        while (true)
        {
            var result = await session.WaitForSignalAsync(slice, ct);
            if (result.Outcome is WaitOutcome.Finished or WaitOutcome.SessionExited)
            {
                return result;
            }

            // A stuck signal returns the moment it fires; counting it as elapsed would let one noisy burst spend
            // the whole cycle budget in seconds.
            if (result.Outcome is WaitOutcome.Timeout)
            {
                totalWaited += slice;
                quiet += slice;
            }

            if (await session.GetRunAsync(runId, ct) is { FinishedAt: not null } run)
            {
                return WaitResult.Finished(run.Outcome ?? "failed");
            }

            var activity = await session.GetActivityAsync(ct);
            if (activity?.LastActivityAt is { } at && DateTimeOffset.UtcNow - at < ActiveWindow)
            {
                if (totalWaited >= MaxCycleWait)
                {
                    return result;
                }

                if (totalWaited >= ResultTimeout && !extensionReported)
                {
                    await session.ReportAsync(Reports.Extend, ct);
                    extensionReported = true;
                }

                quiet = TimeSpan.Zero;
            }
            else if (quiet >= quietBudget || result.Outcome is WaitOutcome.Stuck)
            {
                return result;
            }
        }
    }

    private static int ClampSleep(int seconds) => Math.Clamp(seconds, MinSleepSeconds, MaxSleepSeconds);

    /// <summary>Journal entries the user's phone hears about, so keep the wording stable.</summary>
    internal static class Reports
    {
        public const string CheckIn = "Pilot orchestrator: the current run looks stuck - sent the agent a check-in reminder.";
        public const string Skip = "Pilot orchestrator: still stuck after the check-in - told the agent to set the task aside as failed and move on.";
        public const string Restart = "Pilot orchestrator: the agent stopped responding - restarted its session and set the task aside as failed.";
        public const string Backoff = "Pilot orchestrator: 3 runs in a row got stuck - taking a 30-minute break before trying again.";
        public const string ExitBackoff = "Pilot orchestrator: the provider CLI keeps exiting right after startup - check its install and sign-in - taking a 30-minute break.";
        public const string Extend = "Pilot orchestrator: this run is taking longer than usual but is still making progress - giving it more time.";
    }
}
