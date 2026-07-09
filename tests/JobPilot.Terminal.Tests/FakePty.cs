using JobPilot.Terminal.Pty;

namespace JobPilot.Terminal.Tests;

/// <summary>An <see cref="IPty"/> that records writes and lets a test raise exits for any generation,
/// including a superseded one - the race a real PTY only loses occasionally.</summary>
internal sealed class FakePty : IPty
{
    private int generation;

    public event Action<byte[]>? OutputReceived;
    public event Action<PtyExit>? ProcessExited;

    /// <summary>Generation handed out by the most recent <see cref="Start"/>.</summary>
    public int CurrentGeneration => generation;

    /// <summary>Every byte array written to the PTY, in order.</summary>
    public List<byte[]> Writes { get; } = [];

    /// <summary>Arguments of the most recent <see cref="Start"/>.</summary>
    public string? LastCommand { get; private set; }
    public string[]? LastArgs { get; private set; }
    public string? LastWorkingDirectory { get; private set; }
    public IReadOnlyDictionary<string, string>? LastEnvironment { get; private set; }

    public int StartCount { get; private set; }
    public int StopCount { get; private set; }

    /// <summary>When set, <see cref="Start"/> throws it instead of starting.</summary>
    public Exception? StartFailure { get; set; }

    public int Start(
        string command,
        string[] args,
        string workingDirectory,
        int cols,
        int rows,
        IReadOnlyDictionary<string, string>? environment = null)
    {
        Stop();
        StartCount++;

        if (StartFailure is not null)
        {
            throw new PtyStartException(command, StartFailure);
        }

        LastCommand = command;
        LastArgs = args;
        LastWorkingDirectory = workingDirectory;
        LastEnvironment = environment;
        return ++generation;
    }

    public void Write(byte[] data) => Writes.Add(data);

    public void Resize(int cols, int rows) { }

    public void Stop() => StopCount++;

    public void Dispose() => Stop();

    /// <summary>Raises an exit as if the process of <paramref name="forGeneration"/> had just died.</summary>
    public void RaiseExit(int forGeneration, int exitCode = 1) =>
        ProcessExited?.Invoke(new PtyExit(forGeneration, exitCode));

    public void RaiseOutput(byte[] data) => OutputReceived?.Invoke(data);
}
