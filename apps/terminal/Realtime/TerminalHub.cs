using System.Buffers;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using JobPilot.Terminal.Contracts;
using JobPilot.Terminal.Sessions;

namespace JobPilot.Terminal.Realtime;

/// <summary>
/// The browser transport for the embedded terminal: owns the connected sockets, fans session output out to
/// them, and turns client control messages into session calls.
/// </summary>
public sealed class TerminalHub : IDisposable
{
    /// <summary>Chunks queued per client before it is considered stalled. At 4 KB per PTY read this bounds a
    /// slow client at a few megabytes, after which we drop it rather than buffer the terminal indefinitely.</summary>
    private const int OutboxCapacity = 1024;

    /// <summary>Per-frame receive buffer. Messages larger than this arrive fragmented and are reassembled.</summary>
    private const int ReceiveBufferSize = 8192;

    /// <summary>Ceiling on a single reassembled client message. A large paste is legitimate; a gigabyte is not.</summary>
    private const int MaxMessageBytes = 1024 * 1024;

    private readonly SessionManager session;
    private readonly ILogger<TerminalHub> logger;
    private readonly ConcurrentDictionary<WebSocket, Channel<byte[]>> clients = new();

    public TerminalHub(SessionManager session, ILogger<TerminalHub> logger)
    {
        this.session = session;
        this.logger = logger;

        session.Output += Broadcast;
        session.Exited += OnSessionExited;
    }

    /// <summary>
    /// Serves one browser connection: pumps session output to it, and its control messages to the session.
    /// </summary>
    /// <param name="socket">Accepted WebSocket connection from the browser.</param>
    /// <param name="ct">Cancellation token tied to the HTTP request lifetime.</param>
    public async Task HandleAsync(WebSocket socket, CancellationToken ct)
    {
        // Wait, not DropWrite: a full outbox means the client cannot keep up, and silently discarding bytes
        // from the middle of a terminal stream corrupts the screen. TryWrite fails instead and we disconnect.
        var outbox = Channel.CreateBounded<byte[]>(new BoundedChannelOptions(OutboxCapacity)
        {
            SingleReader = true,
            SingleWriter = false,
            FullMode = BoundedChannelFullMode.Wait,
        });

        clients[socket] = outbox;
        logger.LogInformation("WebSocket client connected.");

        using var connectionEnded = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var sender = SendLoopAsync(socket, outbox, connectionEnded.Token);

        try
        {
            await ReceiveLoopAsync(socket, ct);
        }
        finally
        {
            Unregister(socket);
            await connectionEnded.CancelAsync();
            await sender; // never faults; SendLoopAsync swallows its own transport errors
            logger.LogInformation("WebSocket client disconnected.");
        }
    }

    /// <summary>Queues <paramref name="data"/> for every client; drops any client that cannot keep up.</summary>
    private void Broadcast(byte[] data)
    {
        foreach (var (socket, outbox) in clients)
        {
            if (outbox.Writer.TryWrite(data))
            {
                continue;
            }

            logger.LogWarning("Dropping a WebSocket client that fell {Capacity} chunks behind.", OutboxCapacity);
            Unregister(socket);
            socket.Abort(); // unblocks its receive loop, which tears the connection down
        }
    }

    /// <summary>Removes a client and lets its send loop drain and exit.</summary>
    private void Unregister(WebSocket socket)
    {
        if (clients.TryRemove(socket, out var outbox))
        {
            outbox.Writer.TryComplete();
        }
    }

    private void OnSessionExited(SessionExit exit)
    {
        var message =
            $"\r\n\e[31m[JobPilot.Terminal] {exit.ProviderDisplayName} exited with code {exit.ExitCode}. Use Restart to reopen.\e[0m\r\n";
        Broadcast(Encoding.UTF8.GetBytes(message));
    }

    /// <summary>One reader per socket, so concurrent broadcasts can never interleave on the wire.</summary>
    private async Task SendLoopAsync(WebSocket socket, Channel<byte[]> outbox, CancellationToken ct)
    {
        try
        {
            await foreach (var chunk in outbox.Reader.ReadAllAsync(ct))
            {
                if (socket.State != WebSocketState.Open)
                {
                    return;
                }

                await socket.SendAsync(chunk, WebSocketMessageType.Binary, endOfMessage: true, ct);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Send to a WebSocket client failed; dropping it.");
        }
    }

    private async Task ReceiveLoopAsync(WebSocket socket, CancellationToken ct)
    {
        var buffer = new byte[ReceiveBufferSize];
        var message = new ArrayBufferWriter<byte>(ReceiveBufferSize);

        try
        {
            while (socket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await socket.ReceiveAsync(buffer, ct);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "client closed", ct);
                    return;
                }

                // Fragments of one message all carry its type and cannot interleave, so a non-text message is
                // skipped whole and never lands mid-reassembly.
                if (result.MessageType != WebSocketMessageType.Text)
                {
                    continue;
                }

                if (message.WrittenCount + result.Count > MaxMessageBytes)
                {
                    logger.LogWarning("Closing a WebSocket client that sent a message over {Limit} bytes.", MaxMessageBytes);
                    await socket.CloseAsync(WebSocketCloseStatus.MessageTooBig, "message too large", ct);
                    return;
                }

                message.Write(buffer.AsSpan(0, result.Count));

                // A control message is only complete at EndOfMessage: parsing a fragment would throw, and the
                // input would be dropped with nothing but a warning to show for it.
                if (!result.EndOfMessage)
                {
                    continue;
                }

                Dispatch(message.WrittenSpan);

                // ResetWrittenCount keeps the grown buffer, so one big paste would pin its size for the whole
                // connection. Steady-state traffic is keystrokes; hand the outsized buffer back to the GC.
                if (message.Capacity > ReceiveBufferSize)
                {
                    message = new ArrayBufferWriter<byte>(ReceiveBufferSize);
                }
                else
                {
                    message.ResetWrittenCount();
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (WebSocketException ex)
        {
            logger.LogDebug(ex, "WebSocket closed.");
        }
    }

    private void Dispatch(ReadOnlySpan<byte> utf8Json)
    {
        TerminalClientMessage? message;
        try
        {
            message = JsonSerializer.Deserialize(utf8Json, AppJsonContext.Default.TerminalClientMessage);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Ignoring a malformed WebSocket message.");
            return;
        }

        switch (message?.Type)
        {
            case "input":
                if (TryDecodeInput(message.Data, out var bytes))
                {
                    session.WriteInput(bytes);
                }
                break;

            case "resize":
                // A bad resize from a socket is ignored rather than rejected; there is no reply channel.
                if (message.Cols is { } cols && message.Rows is { } rows && Viewport.IsValid(cols, rows))
                {
                    session.Resize(cols, rows);
                }
                else
                {
                    logger.LogWarning("Ignoring a resize with cols={Cols} rows={Rows}.", message.Cols, message.Rows);
                }
                break;
        }
    }

    private bool TryDecodeInput(string? data, out byte[] bytes)
    {
        bytes = [];
        if (string.IsNullOrEmpty(data))
        {
            return false;
        }

        try
        {
            bytes = Convert.FromBase64String(data);
            return true;
        }
        catch (FormatException ex)
        {
            logger.LogWarning(ex, "Ignoring WebSocket input that is not valid base64.");
            return false;
        }
    }

    public void Dispose()
    {
        session.Output -= Broadcast;
        session.Exited -= OnSessionExited;

        foreach (var (socket, _) in clients)
        {
            Unregister(socket);
        }
    }
}
