using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using JobPilot.Terminal.Pty;

namespace JobPilot.Terminal;

public enum SessionState
{
    Stopped,
    Running
}

public sealed class SessionManager : IDisposable
{
    private readonly PtyService pty;
    private readonly ILogger<SessionManager> logger;
    private readonly ConcurrentDictionary<WebSocket, byte> clients = new();
    private readonly Lock stateLock = new();
    private SessionState state = SessionState.Stopped;

    public SessionManager(PtyService pty, ILogger<SessionManager> logger)
    {
        this.pty = pty;
        this.logger = logger;

        pty.OutputReceived += OnPtyOutput;
        pty.ProcessExited += OnPtyExit;
    }

    public SessionState State
    {
        get
        {
            lock (stateLock)
            {
                return state;
            }
        }
    }

    public void Start(string workingDir, int cols, int rows)
    {
        lock (stateLock)
        {
            if (state == SessionState.Running)
            {
                logger.LogInformation("Session already running; Start is a no-op.");
                return;
            }

            logger.LogInformation("Starting Claude Code: cwd={Cwd} cols={Cols} rows={Rows}", workingDir, cols, rows);
            pty.Start("claude", [], workingDir, cols, rows);
            state = SessionState.Running;
        }
    }

    public void Inject(string command)
    {
        if (string.IsNullOrEmpty(command)) return;

        var line = command.EndsWith('\r') ? command : command + "\r";
        var bytes = Encoding.UTF8.GetBytes(line);
        pty.Write(bytes);
    }

    public void Resize(int cols, int rows)
    {
        pty.Resize(cols, rows);
    }

    public void WriteInput(byte[] data)
    {
        pty.Write(data);
    }

    public void Stop()
    {
        lock (stateLock)
        {
            if (state == SessionState.Stopped) return;
            logger.LogInformation("Stopping Claude Code session.");
            pty.Stop();
            state = SessionState.Stopped;
        }
    }

    public void RegisterClient(WebSocket socket)
    {
        clients.TryAdd(socket, 0);
    }

    public void UnregisterClient(WebSocket socket)
    {
        clients.TryRemove(socket, out _);
    }

    private void OnPtyOutput(byte[] data)
    {
        Broadcast(data);
    }

    private void OnPtyExit(int code)
    {
        lock (stateLock)
        {
            state = SessionState.Stopped;
        }

        var msg = $"\r\n\e[31m[JobPilot.Terminal] Claude Code exited with code {code}. Use Restart to reopen.\e[0m\r\n";
        Broadcast(Encoding.UTF8.GetBytes(msg));
    }

    private void Broadcast(byte[] data)
    {
        foreach (var socket in clients.Keys)
        {
            if (socket.State != WebSocketState.Open) continue;
            try
            {
                socket.SendAsync(data, WebSocketMessageType.Binary, endOfMessage: true, CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Broadcast to client failed; will be cleaned up on next disconnect.");
            }
        }
    }

    public void Dispose()
    {
        Stop();
        pty.OutputReceived -= OnPtyOutput;
        pty.ProcessExited -= OnPtyExit;
    }
}
