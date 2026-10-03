using System.Threading.Channels;
using JobPilot.Terminal.Providers;
using JobPilot.Terminal.Sessions;

namespace JobPilot.Terminal.Pilot;

public sealed class PilotSession : IPilotSession, IDisposable
{
    private const string PilotSkill = "pilot";
    private const string ClearCommand = "/clear";
    private const int Cols = 220;
    private const int Rows = 50;

    // Redraw time between /clear and the cycle command landing on the fresh prompt.
    private static readonly TimeSpan ClearSettle = TimeSpan.FromSeconds(2);

    // The CLIs export logs every second or so, so the last request's usage lands just after the cycle ends.
    private static readonly TimeSpan UsageFlush = TimeSpan.FromSeconds(3);

    private readonly TerminalSession terminal;
    private readonly PilotStore store;
    private readonly PilotApi api;
    private readonly UsageMeter usage;
    private readonly ILogger<PilotSession> logger;
    private readonly StuckDetector stuck = new();

    // A finished run's outcome, or null for a stuck signal, in one channel so a wait sees whichever comes first.
    // Not single-writer: the PTY thread and the event listener both write, and a directive re-queues outcomes.
    private readonly Channel<string?> signals = Channel.CreateUnbounded<string?>(new UnboundedChannelOptions { SingleReader = true });

    private volatile string? currentRunId;

    public PilotSession(TerminalSession terminal, PilotStore store, PilotApi api, UsageMeter usage, ILogger<PilotSession> logger)
    {
        this.terminal = terminal;
        this.store = store;
        this.api = api;
        this.usage = usage;
        this.logger = logger;
        terminal.Output += OnOutput;
    }

    public Provider? RunningProvider => terminal.IsRunning ? terminal.ActiveProvider : null;

    public void Start(PilotSettings settings) =>
        terminal.Start(settings.Provider, Cols, Rows, settings.ApiToken, settings.ApiUrl, settings.WebUrl);

    public async Task SendCycleAsync(PilotSettings settings, string runId, CancellationToken ct)
    {
        // Cycles keep their state in the API. Clearing first prevents mid-cycle auto-compaction and keeps
        // untrusted page content from lingering into the next cycle.
        await SendAsync(ClearCommand, settings.Provider, ct);
        await Task.Delay(ClearSettle, ct);

        while (signals.Reader.TryRead(out _))
        {
        }

        currentRunId = runId;
        stuck.Reset();
        usage.Start();
        await SendAsync($"{settings.Provider.SkillCommand(PilotSkill)} {runId}", settings.Provider, ct);
    }

    public Task SendDirectiveAsync(PilotSettings settings, Directive directive, CancellationToken ct)
    {
        // A directive keeps the stuck run's context: no /clear, and a finish that raced in must survive.
        stuck.Reset();
        DropStuckSignals();
        var result = $"jobpilot-api POST /api/pilot/runs/{currentRunId}/result";
        var text = directive == Directive.CheckIn
            ? $"Checking in: you appear stuck. Finish now and post your result with {result} (outcome \"failed\" if you cannot finish)."
            : $"Stop the current action. Post a failed result now with {result}, saying where it stopped.";
        return SendAsync(text, settings.Provider, ct);
    }

    /// <summary>Called by the event listener for every run.finished event; only the handed-over run counts.</summary>
    public void OnRunFinished(string runId, string outcome)
    {
        if (runId == currentRunId)
        {
            signals.Writer.TryWrite(outcome);
        }
    }

    public async Task<WaitResult> WaitForSignalAsync(TimeSpan timeout, CancellationToken ct)
    {
        using var waitCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var exited = false;

        void OnExited(SessionExit _)
        {
            exited = true;
            waitCts.Cancel();
        }

        // Subscribe before checking IsRunning: an exit between the two would otherwise go unseen for the whole timeout.
        terminal.Exited += OnExited;
        try
        {
            if (!terminal.IsRunning)
            {
                return WaitResult.Exited;
            }

            waitCts.CancelAfter(timeout);
            var signal = await signals.Reader.ReadAsync(waitCts.Token);
            return signal is { } outcome ? WaitResult.Finished(outcome) : WaitResult.Stuck;
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return exited ? WaitResult.Exited : WaitResult.Timeout;
        }
        finally
        {
            terminal.Exited -= OnExited;
        }
    }

    public void Stop() => terminal.Stop();

    // Esc interrupts both provider TUIs and is harmless at an idle prompt.
    public void Interrupt()
    {
        if (terminal.IsRunning)
        {
            terminal.Write([0x1b]);
        }
    }

    public Task DelayAsync(TimeSpan duration, CancellationToken ct) => Task.Delay(duration, ct);

    public async Task<PilotActivity?> GetActivityAsync(CancellationToken ct) =>
        store.Current is { } settings ? await api.GetActivityAsync(settings, ct) : null;

    public async Task ReportAsync(string summary, CancellationToken ct)
    {
        if (store.Current is { } settings)
        {
            await api.ReportAsync(settings, summary, ct);
        }
    }

    public async Task<PilotTaskList?> RefreshTasksAsync(CancellationToken ct) =>
        store.Current is { } settings ? await api.RefreshTasksAsync(settings, ct) : null;

    public async Task<string?> StartRunAsync(string taskId, string taskListVersion, CancellationToken ct) =>
        store.Current is { } settings ? (await api.StartRunAsync(settings, taskId, taskListVersion, ct))?.Id : null;

    public async Task<PilotRunState?> GetRunAsync(string runId, CancellationToken ct) =>
        store.Current is { } settings ? await api.GetRunAsync(settings, runId, ct) : null;

    public async Task FailRunAsync(string runId, CancellationToken ct)
    {
        if (store.Current is { } settings)
        {
            await api.FailRunAsync(settings, runId, ct);
        }
    }

    public async Task JournalCycleAsync(string? cycleId, string summary, string status, int sleepSeconds, CancellationToken ct)
    {
        if (store.Current is { } settings)
        {
            await api.JournalCycleAsync(settings, cycleId, summary, status, sleepSeconds, ct);
        }
    }

    public async Task ReportUsageAsync(string runId, CancellationToken ct)
    {
        await Task.Delay(UsageFlush, ct);
        if (usage.Take() is { } measured && store.Current is { } settings)
        {
            await api.ReportUsageAsync(settings, runId, measured, ct);
        }
    }

    public void Dispose() => terminal.Output -= OnOutput;

    private async Task SendAsync(string command, Provider provider, CancellationToken ct)
    {
        var result = await terminal.SendCommandAsync(command, provider, ct);
        if (result != SendResult.Sent)
        {
            logger.LogWarning("Pilot command {Command} was not sent ({Result}).", command, result);
        }
    }

    private void OnOutput(byte[] data)
    {
        // Interactive sessions skip the stuck heuristic. Nothing is lost: start saves the store before the first cycle.
        if (store.Current is not { Running: true })
        {
            return;
        }

        if (stuck.Feed(data, DateTimeOffset.UtcNow) is var reason and not StuckReason.None)
        {
            logger.LogDebug("Pilot stuck heuristic fired ({Reason}).", reason);
            signals.Writer.TryWrite(null);
        }
    }

    // Stuck evidence left over from before a directive would end its grace at once, but a finish must survive.
    private void DropStuckSignals()
    {
        List<string> kept = [];
        while (signals.Reader.TryRead(out var signal))
        {
            if (signal is { } outcome)
            {
                kept.Add(outcome);
            }
        }

        foreach (var outcome in kept)
        {
            signals.Writer.TryWrite(outcome);
        }
    }
}
