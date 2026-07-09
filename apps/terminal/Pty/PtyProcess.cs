using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using Pty.Net;

namespace JobPilot.Terminal.Pty;

/// <summary>Raised when a PTY process cannot start.</summary>
public sealed class PtyStartException(string command, Exception innerException)
    : Exception($"Failed to start '{command}': {innerException.Message}", innerException);

/// <summary>Pty.Net-backed process using ConPTY or forkpty.</summary>
public sealed class PtyProcess : IPty
{
    static PtyProcess()
    {
        // Attach to Pty.Net's assembly: that is where the missing bundled conpty.dll is imported.
        // The static constructor also ensures SetDllImportResolver runs only once.
        if (OperatingSystem.IsWindows())
        {
            NativeLibrary.SetDllImportResolver(typeof(PtyProvider).Assembly, ResolveConPty);
        }
    }

    private static IntPtr ResolveConPty(string libraryName, Assembly assembly, DllImportSearchPath? searchPath) =>
        libraryName is "os64\\conpty.dll" or "os86\\conpty.dll"
            ? NativeLibrary.Load("kernel32.dll")
            : IntPtr.Zero;

    // Give Pty.Net's exit event a chance to deliver the real code before the EOF fallback reports one.
    private static readonly TimeSpan EofExitGrace = TimeSpan.FromMilliseconds(500);

    private readonly Lock connectionLock = new();

    private IPtyConnection? connection;
    private int generation;
    private int exitRaisedGeneration;

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
            OutputReceived?.Invoke(Encoding.UTF8.GetBytes($"\e[31mFailed to start '{command}': {ex.Message}\e[0m\r\n"));
            throw new PtyStartException(command, ex);
        }

        // Do not suppress killed-process exits; their generation lets SessionManager discard stale ones.
        spawned.ProcessExited += (_, e) => NotifyExit(gen, e.ExitCode);

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
            // The PTY was replaced during the write.
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
            // Invalidate the read loop before closing its stream.
            Interlocked.Increment(ref generation);
            doomed = connection;
            connection = null;
        }

        doomed?.Kill(); // still raises ProcessExited, carrying the generation it was started with
        doomed?.Dispose();
    }

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
                if (bytesRead <= 0)
                {
                    // EOF means the process died. Pty.Net's exit event can be missed when the process
                    // dies before Start subscribes, so raise a fallback exit; NotifyExit dedupes.
                    Thread.Sleep(EofExitGrace);
                    if (Volatile.Read(ref generation) == gen)
                    {
                        NotifyExit(gen, TryGetExitCode(active));
                    }
                    break;
                }

                if (Volatile.Read(ref generation) != gen) break;

                OutputReceived?.Invoke(buffer.AsSpan(0, bytesRead).ToArray());
            }
        }
        catch when (Volatile.Read(ref generation) != gen)
        {
            // Stop closed this generation's stream.
        }
    }

    /// <summary>Raises at most one exit per generation; the real event and the EOF fallback both call it.</summary>
    private void NotifyExit(int gen, int exitCode)
    {
        if (Interlocked.Exchange(ref exitRaisedGeneration, gen) == gen)
        {
            return;
        }
        ProcessExited?.Invoke(new PtyExit(gen, exitCode));
    }

    private static int TryGetExitCode(IPtyConnection connection)
    {
        try
        {
            return connection.ExitCode;
        }
        catch
        {
            return -1;
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
