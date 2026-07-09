namespace JobPilot.Terminal.Contracts;

/// <summary>
/// Bounds on a terminal window size. Both transports that can resize the PTY - <c>POST /sessions/start</c> and
/// the <c>resize</c> WebSocket message - enforce this, though they react differently: the HTTP call rejects,
/// the socket message is ignored. The bound itself is one fact about what ConPTY/forkpty will accept.
/// </summary>
public static class Viewport
{
    public const int MinSize = 1;
    public const int MaxSize = 2000;

    /// <summary>True when <paramref name="cols"/> and <paramref name="rows"/> are both a usable window size.</summary>
    public static bool IsValid(int cols, int rows) =>
        cols is >= MinSize and <= MaxSize && rows is >= MinSize and <= MaxSize;
}
