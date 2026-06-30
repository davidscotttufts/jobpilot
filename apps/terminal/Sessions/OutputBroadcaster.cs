using System.Collections.Concurrent;
using System.Net.WebSockets;

namespace JobPilot.Terminal.Sessions;

/// <summary>
/// Fans PTY output out to every connected browser WebSocket, serializing writes per socket so
/// concurrent broadcasts to the same client never interleave.
/// </summary>
public sealed class OutputBroadcaster(ILogger logger)
{
    private readonly ConcurrentDictionary<WebSocket, SemaphoreSlim> clients = new();

    /// <summary>Adds a client to the broadcast set.</summary>
    public void Register(WebSocket socket) => clients.TryAdd(socket, new SemaphoreSlim(1, 1));

    /// <summary>Removes a client from the broadcast set.</summary>
    public void Unregister(WebSocket socket) => clients.TryRemove(socket, out _);

    /// <summary>Drops all clients (called on shutdown).</summary>
    public void Clear() => clients.Clear();

    /// <summary>Sends <paramref name="data"/> to every open client.</summary>
    public void Broadcast(byte[] data)
    {
        foreach (var (socket, gate) in clients)
        {
            if (socket.State != WebSocketState.Open) continue;
            _ = SendSerializedAsync(socket, gate, data);
        }
    }

    private async Task SendSerializedAsync(WebSocket socket, SemaphoreSlim gate, byte[] data)
    {
        await gate.WaitAsync();
        try
        {
            if (socket.State != WebSocketState.Open) return;
            await socket.SendAsync(data, WebSocketMessageType.Binary, endOfMessage: true, CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Broadcast to client failed; will be cleaned up on next disconnect.");
        }
        finally
        {
            gate.Release();
        }
    }
}
