using System.Text;
using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Contracts;
using JobPilot.Terminal.Pty;

namespace JobPilot.Terminal.Sessions;

/// <summary>
/// Coordinates the lifetime of the active provider PTY session, raising <see cref="Output"/> and
/// <see cref="Exited"/> for a transport to deliver. Knows nothing about WebSockets.
/// </summary>
public sealed class SessionManager : IDisposable
{
    /// <summary>Carriage return sent on its own to submit an injected command.</summary>
    private static readonly byte[] EnterKey = "\r"u8.ToArray();

    /// <summary>Pause between writing an injected command's text and its Enter keystroke, so the
    /// provider TUI reads the submit key separately instead of folding it into a paste.</summary>
    private static readonly TimeSpan SubmitKeyDelay = TimeSpan.FromMilliseconds(75);

    private readonly IPty pty;
    private readonly ILogger<SessionManager> logger;
    private readonly HostInstall install;
    private readonly Lock stateLock = new();

    private volatile SessionState state = SessionState.Stopped;
    private volatile string activeProvider = TerminalProviders.Claude;

    /// <summary>Generation of the PTY this session owns, or 0 when we have relinquished it. A killed process
    /// reports its exit asynchronously, so an exit only concerns us when it carries this generation.</summary>
    private int liveGeneration;

    /// <summary>
    /// Initializes a new <see cref="SessionManager"/> and subscribes to PTY output and exit events.
    /// </summary>
    /// <param name="pty">The PTY used to start and control the terminal process.</param>
    /// <param name="install">Resolved install layout; sessions cannot start without it.</param>
    /// <param name="logger">Logger for session lifecycle events.</param>
    public SessionManager(IPty pty, HostInstall install, ILogger<SessionManager> logger)
    {
        this.pty = pty;
        this.install = install;
        this.logger = logger;

        pty.OutputReceived += OnPtyOutput;
        pty.ProcessExited += OnPtyExit;
    }

    /// <summary>Raised with each chunk of terminal output. Delivering it to clients is the transport's job.</summary>
    public event Action<byte[]>? Output;

    /// <summary>Raised when the session's own process exits. Never raised for a process we replaced.</summary>
    public event Action<SessionExit>? Exited;

    /// <summary>
    /// Gets the current terminal session state.
    /// </summary>
    public SessionState State => state;

    /// <summary>
    /// Gets the active or last requested terminal provider.
    /// </summary>
    public string ActiveProvider => activeProvider;

    /// <summary>
    /// Starts the provider PTY session if it is not already running.
    /// </summary>
    /// <param name="provider">Provider id to launch.</param>
    /// <param name="cols">Initial terminal column count.</param>
    /// <param name="rows">Initial terminal row count.</param>
    /// <param name="apiToken">Per-user agent PAT injected as JOBPILOT_API_TOKEN; falls back to the host env var.</param>
    /// <param name="webUrl">Web app origin (the browser's location) injected as JOBPILOT_WEB; falls back to the host env var.</param>
    /// <param name="apiUrl">Backend base URL (the web's configured API origin) injected as JOBPILOT_API; falls back to the host env var, then localhost.</param>
    /// <exception cref="PtyStartException">Thrown when the PTY provider fails to spawn the process.</exception>
    public void Start(string? provider, int cols, int rows, string? apiToken = null, string? webUrl = null, string? apiUrl = null)
    {
        lock (stateLock)
        {
            var sessionPaths = install.RequirePaths();

            var normalizedProvider = TerminalProviders.Normalize(provider);
            if (state == SessionState.Running && activeProvider == normalizedProvider)
            {
                logger.LogInformation("{Provider} session already running; Start is a no-op.", normalizedProvider);
                return;
            }

            if (state == SessionState.Running)
            {
                logger.LogInformation(
                    "Switching terminal provider from {PreviousProvider} to {NextProvider}.", activeProvider,
                    normalizedProvider);
                // Disown the outgoing PTY before killing it, so its exit lands as stale and never reports
                // the replacement session as dead.
                liveGeneration = 0;
                pty.Stop();
                state = SessionState.Stopped;
            }

            var workingDir = sessionPaths.WorkingDir;
            PlaywrightScratchCleaner.Clean(workingDir, logger);
            var spec = TerminalProviders.GetLaunchSpec(normalizedProvider, sessionPaths.ClaudePluginDir, workingDir);

            logger.LogInformation(
                "Starting {Provider}: cwd={Cwd} command={Command} args={Args} sharedSkillsDir={SharedSkillsDir} cols={Cols} rows={Rows}",
                spec.Provider.DisplayName,
                workingDir,
                spec.Command,
                string.Join(" ", spec.Args),
                sessionPaths.SharedSkillsDir,
                cols,
                rows);

            // Prefer the value the web passed on session start; fall back to the host env var, then a dev default.
            static string FromRequestOrEnv(string? passed, string envKey, string fallback) =>
                !string.IsNullOrEmpty(passed) ? passed : Environment.GetEnvironmentVariable(envKey) ?? fallback;

            var env = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["JOBPILOT_SKILLS_ROOT"] = sessionPaths.SharedSkillsDir,
                ["JOBPILOT_WORKSPACE_ROOT"] = workingDir,
                ["JOBPILOT_API"] = FromRequestOrEnv(apiUrl, "JOBPILOT_API", "http://localhost:4101"),
                ["JOBPILOT_API_TOKEN"] = FromRequestOrEnv(apiToken, "JOBPILOT_API_TOKEN", ""),
                // JOBPILOT_WEB is the browser's own origin, for user-facing links in skill output.
                ["JOBPILOT_WEB"] = FromRequestOrEnv(webUrl, "JOBPILOT_WEB", "http://localhost:4100")
            };

            try
            {
                liveGeneration = pty.Start(spec.Command, spec.Args, workingDir, cols, rows, env);
            }
            catch (PtyStartException ex)
            {
                liveGeneration = 0;
                state = SessionState.Stopped;
                logger.LogError(ex, "Failed to start {Provider} PTY.", normalizedProvider);
                throw;
            }

            activeProvider = normalizedProvider;
            state = SessionState.Running;
        }
    }

    /// <summary>
    /// Injects a command line into the running session, then submits it with a separate Enter keystroke.
    /// </summary>
    /// <param name="command">Bare command line - no trailing newline; the submit key is sent by this method.</param>
    /// <param name="expectedProvider">Optional provider id the caller believes is active. When set,
    /// the inject is rejected if it does not match the active provider.</param>
    /// <exception cref="ArgumentException">The expected provider id is not a known provider.</exception>
    public async Task<InjectResult> Inject(string command, string? expectedProvider = null)
    {
        if (string.IsNullOrEmpty(command)) return InjectResult.NotRunning;

        int generation;
        lock (stateLock)
        {
            if (state != SessionState.Running) return InjectResult.NotRunning;

            if (expectedProvider is not null)
            {
                var normalized = TerminalProviders.Normalize(expectedProvider);
                if (normalized != activeProvider)
                {
                    logger.LogWarning(
                        "Rejected inject: expected provider {Expected} but {Actual} is active.",
                        normalized, activeProvider);
                    return InjectResult.ProviderMismatch;
                }
            }

            generation = liveGeneration;

            // Write the command text without the submit key so the provider's TUI renders it as input.
            pty.Write(Encoding.UTF8.GetBytes(command));
        }

        // Send Enter separately: bundled with the text, providers treat the burst as a paste and the CR
        // becomes a literal newline. The delay lands it in its own PTY read so it submits.
        await Task.Delay(SubmitKeyDelay);

        lock (stateLock)
        {
            // A provider switch during the delay leaves a *different* session running; its TUI must not
            // receive a submit key for a command it never saw.
            if (state != SessionState.Running || liveGeneration != generation)
            {
                logger.LogWarning("Dropped the submit key: the session ended or was replaced mid-inject.");
                return InjectResult.NotRunning;
            }

            pty.Write(EnterKey);
        }

        return InjectResult.Injected;
    }

    /// <summary>
    /// Resizes the active PTY viewport.
    /// </summary>
    /// <param name="cols">New terminal column count.</param>
    /// <param name="rows">New terminal row count.</param>
    public void Resize(int cols, int rows)
    {
        pty.Resize(cols, rows);
    }

    /// <summary>
    /// Writes raw UTF-8 or control-sequence bytes to the active PTY.
    /// </summary>
    /// <param name="data">Bytes received from a connected terminal client.</param>
    public void WriteInput(byte[] data)
    {
        pty.Write(data);
    }

    /// <summary>
    /// Stops the active PTY session and marks the session as stopped.
    /// </summary>
    public void Stop()
    {
        lock (stateLock)
        {
            if (state == SessionState.Stopped) return;
            logger.LogInformation("Stopping {Provider} session.", activeProvider);
            pty.Stop();
            state = SessionState.Stopped;
        }
    }

    private void OnPtyOutput(byte[] data) => Output?.Invoke(data);

    private void OnPtyExit(PtyExit exit)
    {
        string provider;
        lock (stateLock)
        {
            // Stale: this PTY was killed to make room for another, or its exit was already reported.
            if (exit.Generation != liveGeneration) return;

            liveGeneration = 0;
            provider = activeProvider;
            state = SessionState.Stopped;
        }

        Exited?.Invoke(new SessionExit(TerminalProviders.GetDisplayName(provider), exit.ExitCode));
    }

    /// <summary>
    /// Stops the PTY session and detaches event handlers.
    /// </summary>
    public void Dispose()
    {
        Stop();
        pty.OutputReceived -= OnPtyOutput;
        pty.ProcessExited -= OnPtyExit;
    }
}
