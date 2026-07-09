using System.Net.WebSockets;
using System.Text;
using JobPilot.Terminal.Models;
using JobPilot.Terminal.Plugins;
using JobPilot.Terminal.Pty;

namespace JobPilot.Terminal.Sessions;

/// <summary>
/// Coordinates the lifetime of the active provider PTY session and fans its output out to connected
/// WebSocket clients (via <see cref="OutputBroadcaster"/>).
/// </summary>
public sealed class SessionManager : IDisposable
{
    /// <summary>Carriage return sent on its own to submit an injected command.</summary>
    private static readonly byte[] EnterKey = "\r"u8.ToArray();

    /// <summary>Pause between writing an injected command's text and its Enter keystroke, so the
    /// provider TUI reads the submit key separately instead of folding it into a paste.</summary>
    private static readonly TimeSpan SubmitKeyDelay = TimeSpan.FromMilliseconds(75);

    private readonly PtyService pty;
    private readonly ILogger<SessionManager> logger;
    private readonly TerminalSessionPaths? paths;
    private readonly OutputBroadcaster broadcaster;
    private readonly Lock stateLock = new();

    private volatile SessionState state = SessionState.Stopped;
    private volatile string activeProvider = TerminalProviders.Claude;
    private bool suppressNextExitMessage;

    /// <summary>
    /// Initializes a new <see cref="SessionManager"/> and subscribes to PTY output and exit events.
    /// </summary>
    /// <param name="pty">The PTY service used to start and control the terminal process.</param>
    /// <param name="logger">Logger for session lifecycle events.</param>
    public SessionManager(PtyService pty, ILogger<SessionManager> logger)
    {
        this.pty = pty;
        this.logger = logger;
        // A broken install (missing plugin tree) must not fail construction - /healthz would 500 and
        // the dashboard would read a running host as "offline". Report it as degraded instead.
        try
        {
            paths = TerminalSessionPaths.Resolve();
        }
        catch (Exception ex)
        {
            PathsError = ex.Message;
            logger.LogError(ex, "Terminal host install is incomplete; sessions cannot start.");
        }
        // Invariant for the process lifetime, so resolve once here rather than per /healthz poll.
        CanUpdate = paths is not null && ReleaseUpdates.IsPublishedInstall(paths.ClaudePluginDir);
        broadcaster = new OutputBroadcaster(logger);

        pty.OutputReceived += OnPtyOutput;
        pty.ProcessExited += OnPtyExit;
    }

    /// <summary>
    /// Non-null when the plugin tree could not be resolved; /healthz reports the host as degraded.
    /// </summary>
    public string? PathsError { get; }

    /// <summary>True when this is a published install (not a dev checkout), so the host can self-update.</summary>
    public bool CanUpdate { get; }

    /// <summary>
    /// Gets the current terminal session state.
    /// </summary>
    public SessionState State => state;

    /// <summary>
    /// Gets the active or last requested terminal provider.
    /// </summary>
    public string ActiveProvider => activeProvider;

    /// <summary>
    /// Gets every supported terminal provider.
    /// </summary>
    public static TerminalProviderInfo[] Providers => TerminalSessionPaths.Providers();

    /// <summary>
    /// Host version (from the assembly), reported by /healthz so the dashboard can detect a stale install.
    /// </summary>
    public static string HostVersion { get; } =
        typeof(SessionManager).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";

    /// <summary>
    /// Starts the provider PTY session if it is not already running.
    /// </summary>
    /// <param name="provider">Provider id to launch.</param>
    /// <param name="requestedWorkingDir">Optional working directory for the spawned process.</param>
    /// <param name="cols">Initial terminal column count.</param>
    /// <param name="rows">Initial terminal row count.</param>
    /// <param name="apiToken">Per-user agent PAT injected as JOBPILOT_API_TOKEN; falls back to the host env var.</param>
    /// <param name="webUrl">Web app origin (the browser's location) injected as JOBPILOT_WEB; falls back to the host env var.</param>
    /// <param name="apiUrl">Backend base URL (the web's configured API origin) injected as JOBPILOT_API; falls back to the host env var, then localhost.</param>
    /// <exception cref="PtyStartException">Thrown when the PTY provider fails to spawn the process.</exception>
    public void Start(string? provider, string? requestedWorkingDir, int cols, int rows, string? apiToken = null, string? webUrl = null, string? apiUrl = null)
    {
        lock (stateLock)
        {
            var sessionPaths = paths ?? throw new InvalidOperationException(
                $"Terminal host install is incomplete - reinstall the JobPilot agent. ({PathsError})");

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
                suppressNextExitMessage = true;
                pty.Stop();
                state = SessionState.Stopped;
            }

            var workingDir = sessionPaths.ResolveWorkingDir(requestedWorkingDir);
            PlaywrightScratchCleaner.Clean(workingDir, logger);
            var spec = sessionPaths.GetLaunchSpec(normalizedProvider, workingDir);

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
                pty.Start(spec.Command, spec.Args, workingDir, cols, rows, env);
            }
            catch (PtyStartException ex)
            {
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
    /// <returns>True if the command was written to the PTY; false when the session is stopped or the
    /// expected provider does not match.</returns>
    public async Task<bool> Inject(string command, string? expectedProvider = null)
    {
        if (string.IsNullOrEmpty(command)) return false;

        lock (stateLock)
        {
            if (state != SessionState.Running) return false;

            if (expectedProvider is not null)
            {
                var normalized = TerminalProviders.Normalize(expectedProvider);
                if (normalized != activeProvider)
                {
                    logger.LogWarning(
                        "Rejected inject: expected provider {Expected} but {Actual} is active.",
                        normalized, activeProvider);
                    return false;
                }
            }

            // Write the command text without the submit key so the provider's TUI renders it as input.
            pty.Write(Encoding.UTF8.GetBytes(command));
        }

        // Send Enter separately: bundled with the text, providers treat the burst as a paste and the CR
        // becomes a literal newline. The delay lands it in its own PTY read so it submits.
        await Task.Delay(SubmitKeyDelay);

        if (state != SessionState.Running) return false;
        pty.Write(EnterKey);
        return true;
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

    /// <summary>
    /// Adds a WebSocket client to the output broadcast set.
    /// </summary>
    /// <param name="socket">The connected browser WebSocket.</param>
    public void RegisterClient(WebSocket socket) => broadcaster.Register(socket);

    /// <summary>
    /// Removes a WebSocket client from the output broadcast set.
    /// </summary>
    /// <param name="socket">The disconnected browser WebSocket.</param>
    public void UnregisterClient(WebSocket socket) => broadcaster.Unregister(socket);

    private void OnPtyOutput(byte[] data) => broadcaster.Broadcast(data);

    private void OnPtyExit(int code)
    {
        string provider;
        bool suppressMessage;
        lock (stateLock)
        {
            provider = activeProvider;
            suppressMessage = suppressNextExitMessage;
            suppressNextExitMessage = false;
            if (!suppressMessage)
            {
                state = SessionState.Stopped;
            }
        }

        if (suppressMessage) return;

        var displayName = TerminalProviders.GetDisplayName(provider);
        var msg = $"\r\n\e[31m[JobPilot.Terminal] {displayName} exited with code {code}. Use Restart to reopen.\e[0m\r\n";
        broadcaster.Broadcast(Encoding.UTF8.GetBytes(msg));
    }

    /// <summary>
    /// Stops the PTY session and detaches event handlers.
    /// </summary>
    public void Dispose()
    {
        Stop();
        pty.OutputReceived -= OnPtyOutput;
        pty.ProcessExited -= OnPtyExit;
        broadcaster.Clear();
    }
}
