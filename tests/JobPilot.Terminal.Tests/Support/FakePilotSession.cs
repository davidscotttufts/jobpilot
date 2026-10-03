using JobPilot.Terminal.Pilot;
using JobPilot.Terminal.Providers;

namespace JobPilot.Terminal.Tests;

internal sealed class FakePilotSession : IPilotSession
{
    // The loop records from a background thread while the test asserts, so the logs are read as snapshots.
    private readonly Lock sync = new();
    private readonly List<string> actions = [];
    private readonly List<string> reports = [];
    private readonly List<string> cycles = [];
    private readonly List<string> failedRuns = [];

    public List<string> Actions => Snapshot(actions);

    public List<string> Reports => Snapshot(reports);

    public int UsageReports { get; private set; }

    /// <summary>The cycle entries the host journaled, as "status: summary".</summary>
    public List<string> Cycles => Snapshot(cycles);

    public List<string> FailedRuns => Snapshot(failedRuns);

    /// <summary>The details of the journaled cycles; read after the run, when nothing else writes.</summary>
    public List<CycleDetail> CycleDetails { get; } = [];

    /// <summary>The token total each usage report returns.</summary>
    public long? MeasuredTokens { get; set; }

    /// <summary>The id every run start returns; null makes the server refuse the start.</summary>
    public string? StartedRunId { get; set; } = "run-1";

    /// <summary>Results of successive run reads; an empty queue returns null, a failed read.</summary>
    public Queue<PilotRunState?> Runs { get; } = new();

    /// <summary>Results of successive refreshes; an empty queue returns <see cref="DefaultTaskList"/>.</summary>
    public Queue<PilotTaskList?> TaskLists { get; } = new();

    /// <summary>One task by default, so a cycle wakes the agent.</summary>
    public PilotTaskList? DefaultTaskList { get; set; } = Builders.TaskList(tasks: 1, sleep: 30);

    /// <summary>Results of successive waits; an empty queue times out.</summary>
    public Queue<WaitResult> Signals { get; } = new();

    /// <summary>Results of successive probes; an empty queue returns <see cref="DefaultActivity"/>.</summary>
    public Queue<PilotActivity?> Activities { get; } = new();

    /// <summary>Null by default: a failed probe, so no run looks active.</summary>
    public PilotActivity? DefaultActivity { get; set; }

    public bool BlockActivity { get; set; }

    public TaskCompletionSource ActivityStarted { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public bool BlockReport { get; set; }

    public TaskCompletionSource ReportStarted { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

    /// <summary>Blocks delays over a minute until cancelled, like a real inter-cycle sleep.</summary>
    public bool BlockSleep { get; set; }

    /// <summary>Blocks a wait with nothing scripted until cancelled, instead of timing out.</summary>
    public bool BlockWhenUnscripted { get; set; }

    public Provider? RunningProvider { get; set; }

    public void Start(PilotSettings settings)
    {
        Record("start");
        RunningProvider = settings.Provider;
    }

    public Task SendCycleAsync(PilotSettings settings, string runId, CancellationToken ct)
    {
        Record("cycle");
        return Task.CompletedTask;
    }

    public Task SendDirectiveAsync(PilotSettings settings, Directive directive, CancellationToken ct)
    {
        Record(directive == Directive.CheckIn ? "check-in" : "skip");
        return Task.CompletedTask;
    }

    public async Task<WaitResult> WaitForSignalAsync(TimeSpan timeout, CancellationToken ct)
    {
        Record("wait");
        if (Signals.TryDequeue(out var result))
        {
            return result;
        }

        if (BlockWhenUnscripted)
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, ct);
        }

        return WaitResult.Timeout;
    }

    public void Stop()
    {
        Record("stop");
        RunningProvider = null;
    }

    public void Interrupt() => Record("interrupt");

    public async Task DelayAsync(TimeSpan duration, CancellationToken ct)
    {
        Record($"sleep:{(int)duration.TotalSeconds}");
        if (BlockSleep && duration > TimeSpan.FromMinutes(1))
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, ct);
        }
    }

    public async Task<PilotActivity?> GetActivityAsync(CancellationToken ct)
    {
        ActivityStarted.TrySetResult();
        if (BlockActivity)
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, ct);
        }

        lock (sync)
        {
            return Activities.Count > 0 ? Activities.Dequeue() : DefaultActivity;
        }
    }

    public async Task ReportAsync(string summary, CancellationToken ct)
    {
        lock (sync)
        {
            reports.Add(summary);
        }

        ReportStarted.TrySetResult();
        if (BlockReport)
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, ct);
        }
    }

    public Task<PilotTaskList?> RefreshTasksAsync(CancellationToken ct)
    {
        lock (sync)
        {
            return Task.FromResult(TaskLists.Count > 0 ? TaskLists.Dequeue() : DefaultTaskList);
        }
    }

    public Task<string?> StartRunAsync(string taskId, string taskListVersion, CancellationToken ct) =>
        Task.FromResult(StartedRunId);

    public Task<PilotRunState?> GetRunAsync(string runId, CancellationToken ct)
    {
        lock (sync)
        {
            return Task.FromResult(Runs.Count > 0 ? Runs.Dequeue() : null);
        }
    }

    public Task FailRunAsync(string runId, CancellationToken ct)
    {
        lock (sync)
        {
            failedRuns.Add(runId);
        }

        return Task.CompletedTask;
    }

    public Task JournalCycleAsync(string? cycleId, string summary, CycleDetail detail, CancellationToken ct)
    {
        lock (sync)
        {
            cycles.Add($"{detail.Status}: {summary}");
            CycleDetails.Add(detail);
        }

        return Task.CompletedTask;
    }

    public Task<long?> ReportUsageAsync(string runId, CancellationToken ct)
    {
        lock (sync)
        {
            UsageReports++;
        }

        return Task.FromResult(MeasuredTokens);
    }

    private void Record(string action)
    {
        lock (sync)
        {
            actions.Add(action);
        }
    }

    private List<string> Snapshot(List<string> list)
    {
        lock (sync)
        {
            return [.. list];
        }
    }
}
