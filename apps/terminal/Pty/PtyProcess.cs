using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using Pty.Net;

namespace JobPilot.Terminal.Pty;

/// <summary>
/// Raised when the PTY fails to spawn the requested executable.
/// </summary>
public sealed class PtyStartException(string command, Exception innerException)
    : Exception($"Failed to start '{command}': {innerException.Message}", innerException);

/// <summary>
/// Pty.Net-backed PTY: ConPTY on Windows, forkpty via libc on Linux/macOS. Long-lived; each
/// <see cref="Start"/> swaps the underlying connection and mints a new generation.
/// </summary>
public sealed class PtyProcess : IPty
{
    static PtyProcess()
    {
        // NOTE: PtyProvider is Pty.Net's type, not ours. The resolver must be attached to *its* assembly so
        // its conpty.dll import is intercepted; pointing this at typeof(PtyProcess).Assembly silently breaks
        // every Windows session. SetDllImportResolver also throws if called twice, hence the static ctor.
        if (OperatingSystem.IsWindows())
        {
            NativeLibrary.SetDllImportResolver(typeof(PtyProvider).Assembly, ResolveConPty);
        }
    }

    /// <summary>Quick.PtyNet loads a bundled os64\conpty.dll it never ships; use the in-box ConPTY in kernel32.</summary>
    private static IntPtr ResolveConPty(string libraryName, Assembly assembly, DllImportSearchPath? searchPath) =>
        libraryName is "os64\\conpty.dll" or "os86\\conpty.dll"
            ? NativeLibrary.Load("kernel32.dll")
            : IntPtr.Zero;

    private readonly Lock connectionLock = new();

    private IPtyConnection? connection;
    private int generation;

    /// <inheritdoc />
    public event Action<byte[]>? OutputReceived;

    /// <inheritdoc />
    public event Action<PtyExit>? ProcessExited;

    /// <inheritdoc />
    public int Start(
        string command,
        string[] args,
        string workingDirectory,
        int cols,
        int rows,
        IReadOnlyDictionary<string, string>? environment = null)
    {
        Stop();

        // Mint before spawning, so the read loop and output closure both key off this start.
        var gen = Interlocked.Increment(ref generation);

        IPtyConnection spawned;
        try
        {
            if (!OperatingSystem.IsWindows() && !OperatingSystem.IsLinux() && !OperatingSystem.IsMacOS())
            {
                throw new PlatformNotSupportedException("The JobPilot terminal supports Windows, macOS, and Linux.");
            }

            spawned = Task.Run(() => PtyProvider.SpawnAsync(BuildOptions(command, args, workingDirectory, cols, rows, environment), CancellationToken.None))
                .GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            // Surface the failure in the terminal itself before the HTTP error reaches the dashboard.
            OutputReceived?.Invoke(Encoding.UTF8.GetBytes($"\e[31mFailed to start '{command}': {ex.Message}\e[0m\r\n"));
            throw new PtyStartException(command, ex);
        }

        // Ungated on purpose: a caller tells its own teardown apart from a crash by the generation, and
        // suppressing this event for a killed process would strand it waiting for an exit that never comes.
        spawned.ProcessExited += (_, e) => ProcessExited?.Invoke(new PtyExit(gen, e.ExitCode));

        lock (connectionLock)
        {
            connection = spawned;
        }

        new Thread(() => ReadLoop(spawned, gen)) { IsBackground = true, Name = "PTY-Read" }.Start();
        return gen;
    }

    /// <inheritdoc />
    public void Write(byte[] data)
    {
        var gen = Volatile.Read(ref generation);
        var active = CurrentConnection();
        if (active is null)
        {
            return;
        }

        try
        {
            active.WriterStream.Write(data, 0, data.Length);
            active.WriterStream.Flush();
        }
        catch when (Volatile.Read(ref generation) != gen)
        {
            // Torn down mid-write; the caller's session is already over.
        }
    }

    /// <inheritdoc />
    public void Resize(int cols, int rows) => CurrentConnection()?.Resize(cols, rows);

    /// <inheritdoc />
    public void Stop()
    {
        IPtyConnection? doomed;
        lock (connectionLock)
        {
            // Invalidate before Kill: the read loop must already see a stale generation when its stream faults.
            Interlocked.Increment(ref generation);
            doomed = connection;
            connection = null;
        }

        doomed?.Kill(); // still raises ProcessExited, carrying the generation it was started with
        doomed?.Dispose();
    }

    /// <summary>Kills the active PTY and releases it.</summary>
    public void Dispose() => Stop();

    private IPtyConnection? CurrentConnection()
    {
        lock (connectionLock)
        {
            return connection;
        }
    }

    private void ReadLoop(IPtyConnection active, int gen)
    {
        var buffer = new byte[4096];
        try
        {
            while (Volatile.Read(ref generation) == gen)
            {
                var bytesRead = active.ReaderStream.Read(buffer, 0, buffer.Length);
                if (bytesRead <= 0) break;

                // Re-check: a Stop() racing this read must not push a dead session's bytes at the transport.
                if (Volatile.Read(ref generation) != gen) break;

                OutputReceived?.Invoke(buffer.AsSpan(0, bytesRead).ToArray());
            }
        }
        catch when (Volatile.Read(ref generation) != gen)
        {
            // Our generation ended; the faulted stream is the expected consequence of Stop().
        }
    }

    private static PtyOptions BuildOptions(
        string command,
        string[] args,
        string workingDirectory,
        int cols,
        int rows,
        IReadOnlyDictionary<string, string>? environment)
    {
        var commandLine = new string[args.Length + 1];
        commandLine[0] = command;
        Array.Copy(args, 0, commandLine, 1, args.Length);

        // UTF-8 locale so spawned tools don't mangle non-ASCII; macOS ships en_US.UTF-8, not C.UTF-8.
        var utf8Locale = OperatingSystem.IsMacOS() ? "en_US.UTF-8" : "C.UTF-8";
        var env = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["TERM"] = "xterm-256color",
            ["LANG"] = utf8Locale,
            ["LC_ALL"] = utf8Locale,
            ["PYTHONUTF8"] = "1",
        };
        if (environment is not null)
        {
            foreach (var kvp in environment)
            {
                env[kvp.Key] = kvp.Value;
            }
        }

        return new PtyOptions
        {
            App = command,
            CommandLine = commandLine,
            Cwd = workingDirectory,
            Cols = cols,
            Rows = rows,
            ForceWinPty = false,
            Environment = env,
        };
    }
}
