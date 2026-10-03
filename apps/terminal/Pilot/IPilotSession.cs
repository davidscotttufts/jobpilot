using JobPilot.Terminal.Providers;

namespace JobPilot.Terminal.Pilot;

public enum WaitOutcome
{
    Finished,
    Timeout,
    SessionExited,
    Stuck,
}

/// <summary><see cref="RunOutcome"/> is the run's server outcome, set only for <see cref="WaitOutcome.Finished"/>.</summary>
public readonly record struct WaitResult(WaitOutcome Outcome, string? RunOutcome = null)
{
    public static readonly WaitResult Timeout = new(WaitOutcome.Timeout);
    public static readonly WaitResult Exited = new(WaitOutcome.SessionExited);
    public static readonly WaitResult Stuck = new(WaitOutcome.Stuck);

    public static WaitResult Finished(string runOutcome) => new(WaitOutcome.Finished, runOutcome);
}

/// <summary>CheckIn asks the agent to post its result; Skip makes it post a failed one.</summary>
public enum Directive
{
    CheckIn,
    Skip,
}

/// <summary>The loop's one seam to the terminal, the API, and the clock, so tests can script a whole cycle.</summary>
public interface IPilotSession
{
    /// <summary>Null when no session is running.</summary>
    Provider? RunningProvider { get; }

    void Start(PilotSettings settings);

    /// <summary>Clears the agent's context and hands it the run.</summary>
    Task SendCycleAsync(PilotSettings settings, string runId, CancellationToken ct);

    Task SendDirectiveAsync(PilotSettings settings, Directive directive, CancellationToken ct);

    /// <summary>Returns when the handed-over run finishes, the session exits, a stuck signal fires, or the timeout passes.</summary>
    Task<WaitResult> WaitForSignalAsync(TimeSpan timeout, CancellationToken ct);

    void Stop();

    /// <summary>Aborts the agent's current turn but keeps the session.</summary>
    void Interrupt();

    Task DelayAsync(TimeSpan duration, CancellationToken ct);

    // The API calls below return null on failure and throw only on the caller's cancellation.
    Task<PilotActivity?> GetActivityAsync(CancellationToken ct);

    Task ReportAsync(string summary, CancellationToken ct);

    Task<PilotTaskList?> RefreshTasksAsync(CancellationToken ct);

    /// <summary>The new run's id, or null when the server refuses the start.</summary>
    Task<string?> StartRunAsync(string taskId, string taskListVersion, CancellationToken ct);

    Task<PilotRunState?> GetRunAsync(string runId, CancellationToken ct);

    Task FailRunAsync(string runId, CancellationToken ct);

    /// <param name="cycleId">The run id for a working cycle, so its entries group with the agent's; null for an empty one.</param>
    Task JournalCycleAsync(string? cycleId, string summary, CycleDetail detail, CancellationToken ct);

    /// <summary>Posts the token usage measured since the last <see cref="SendCycleAsync"/> to the run. Its total, or null when none was measured.</summary>
    Task<long?> ReportUsageAsync(string runId, CancellationToken ct);
}
