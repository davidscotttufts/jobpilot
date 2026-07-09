namespace JobPilot.Terminal.Pty;

/// <summary>A PTY process exit, tagged with the generation that produced it.</summary>
/// <param name="Generation">Value returned by the <see cref="IPty.Start"/> that spawned the process.</param>
/// <param name="ExitCode">Process exit code.</param>
public readonly record struct PtyExit(int Generation, int ExitCode);

/// <summary>
/// Owns at most one live pseudo-terminal. Each <see cref="Start"/> mints a monotonic generation, and events
/// carry the generation that raised them - a killed process can report its exit long after a replacement is
/// running, and the consumer must be able to tell the two apart.
/// </summary>
public interface IPty : IDisposable
{
    /// <summary>Raised when the active PTY emits output bytes. Output from a superseded generation is dropped.</summary>
    event Action<byte[]>? OutputReceived;

    /// <summary>Raised when a PTY process exits, tagged with its generation. Fires for killed processes too.</summary>
    event Action<PtyExit>? ProcessExited;

    /// <summary>
    /// Stops any running process and starts a new one, returning its generation.
    /// </summary>
    /// <exception cref="PtyStartException">The process could not be spawned.</exception>
    int Start(
        string command,
        string[] args,
        string workingDirectory,
        int cols,
        int rows,
        IReadOnlyDictionary<string, string>? environment = null);

    /// <summary>Writes raw terminal input bytes to the active PTY. No-op when none is running.</summary>
    void Write(byte[] data);

    /// <summary>Resizes the active PTY viewport. No-op when none is running.</summary>
    void Resize(int cols, int rows);

    /// <summary>Kills the active PTY. Its <see cref="ProcessExited"/> still fires, carrying its generation.</summary>
    void Stop();
}
