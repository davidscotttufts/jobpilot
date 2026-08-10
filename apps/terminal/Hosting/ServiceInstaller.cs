using System.Diagnostics;
using System.Text;

namespace JobPilot.Terminal.Hosting;

/// <summary>
/// Registers the host with the OS supervisor so it restarts after a crash and returns after a reboot.
///
/// Until now the host was launched detached with nothing owning its lifetime: one crash - or one
/// stray kill of a parent shell - left the machine with no agent until a human re-ran setup.
/// </summary>
public static class ServiceInstaller
{
    public const string ServiceLabel = "net.jobpilot.terminal";

    public enum InstallResult
    {
        Installed = 0,
        Unsupported = 2,
        Failed = 1,
    }

    /// <summary>
    /// launchd agent for the current user.
    ///
    /// Two details are load-bearing. <c>KeepAlive</c> is a dict keyed on <c>SuccessfulExit</c>, not
    /// <c>true</c>: the host exits 0 deliberately in two flows - the self-update handoff, which
    /// relaunches a replacement that binds :4102 itself, and the dashboard's Stop button. Blanket
    /// KeepAlive would respawn a rival for the port after an update (a permanent crash loop, with
    /// the real host an unsupervised orphan) and make Stop impossible to obey. And <c>PATH</c> is
    /// written in explicitly: an agent inherits launchd's environment, not the login shell's, and
    /// the host spawns `claude`/`codex` by bare name - without this every session it starts dies
    /// with command-not-found while /healthz stays green.
    /// </summary>
    public static string BuildLaunchAgent(
        string executablePath,
        string workingDirectory,
        string logPath,
        string path)
    {
        return $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
            <plist version="1.0">
            <dict>
              <key>Label</key><string>{Xml(ServiceLabel)}</string>
              <key>ProgramArguments</key>
              <array>
                <string>{Xml(executablePath)}</string>
              </array>
              <key>WorkingDirectory</key><string>{Xml(workingDirectory)}</string>
              <key>EnvironmentVariables</key>
              <dict>
                <key>PATH</key><string>{Xml(path)}</string>
              </dict>
              <key>RunAtLoad</key><true/>
              <key>KeepAlive</key>
              <dict>
                <key>SuccessfulExit</key><false/>
              </dict>
              <key>ProcessType</key><string>Interactive</string>
              <key>StandardOutPath</key><string>{Xml(logPath)}</string>
              <key>StandardErrorPath</key><string>{Xml(logPath)}</string>
            </dict>
            </plist>

            """;
    }

    /// <summary>
    /// systemd *user* unit. `on-failure` rather than `always` for the same reason launchd keys on
    /// SuccessfulExit. ExecStart is quoted and `%` doubled - systemd splits on whitespace and treats
    /// `%` as a specifier, either of which turns a valid path into a unit that can never start.
    /// </summary>
    public static string BuildSystemdUnit(string executablePath, string workingDirectory, string path)
    {
        return $"""
            [Unit]
            Description=JobPilot agent terminal host
            After=network.target

            [Service]
            Type=simple
            ExecStart="{Systemd(executablePath)}"
            WorkingDirectory="{Systemd(workingDirectory)}"
            Environment="PATH={Systemd(path)}"
            Restart=on-failure
            RestartSec=2

            [Install]
            WantedBy=default.target

            """;
    }

    public static string LaunchAgentPath(string home) =>
        Path.Combine(home, "Library", "LaunchAgents", $"{ServiceLabel}.plist");

    public static string SystemdUnitPath(string home) =>
        Path.Combine(home, ".config", "systemd", "user", "jobpilot-terminal.service");

    /// <summary>Writes and loads the unit. The caller maps the result to an exit code.</summary>
    public static InstallResult Install(string executablePath, TextWriter output)
    {
        // A build output must not become the machine's permanent :4102 owner: it never self-updates
        // and resolves its plugin tree from the repo, so it would quietly displace `bun run dev`.
        // ProtocolRegistrar refuses the URL scheme for the same reason.
        if (!HostInstall.IsPublishedHost)
        {
            output.WriteLine(
                "JobPilot: refusing to supervise a build output - install the released host first, then run --install-service from ~/.jobpilot.");
            return InstallResult.Failed;
        }
        if (!File.Exists(executablePath))
        {
            output.WriteLine($"JobPilot: cannot supervise '{executablePath}' - it is not a file.");
            return InstallResult.Failed;
        }

        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var workingDirectory = Path.GetDirectoryName(executablePath) ?? home;
        // Captured from the installing shell, which is the only place the agent CLIs are on PATH.
        var path = Environment.GetEnvironmentVariable("PATH") ?? "/usr/local/bin:/usr/bin:/bin";

        try
        {
            if (OperatingSystem.IsMacOS())
            {
                var unit = LaunchAgentPath(home);
                Directory.CreateDirectory(Path.GetDirectoryName(unit)!);
                var log = Path.Combine(workingDirectory, "host.log");
                File.WriteAllText(unit, BuildLaunchAgent(executablePath, workingDirectory, log, path), Encoding.UTF8);
                // Unload first so a re-install replaces a stale definition rather than erroring.
                Run("launchctl", ["unload", "-w", unit]);
                var (ok, detail) = Run("launchctl", ["load", "-w", unit]);
                if (!ok)
                {
                    output.WriteLine($"JobPilot: wrote {unit} but launchctl refused it: {detail}");
                    return InstallResult.Failed;
                }
                output.WriteLine($"JobPilot: installed and started the {ServiceLabel} launch agent.");
                return InstallResult.Installed;
            }

            if (OperatingSystem.IsLinux())
            {
                var unit = SystemdUnitPath(home);
                Directory.CreateDirectory(Path.GetDirectoryName(unit)!);
                File.WriteAllText(unit, BuildSystemdUnit(executablePath, workingDirectory, path), Encoding.UTF8);
                Run("systemctl", ["--user", "daemon-reload"]);
                var (ok, detail) = Run("systemctl", ["--user", "enable", "--now", "jobpilot-terminal.service"]);
                if (!ok)
                {
                    output.WriteLine($"JobPilot: wrote {unit} but systemctl refused it: {detail}");
                    return InstallResult.Failed;
                }
                // Without lingering the user manager dies at logout, taking the host with it.
                Run("loginctl", ["enable-linger", Environment.UserName]);
                output.WriteLine("JobPilot: installed and started the jobpilot-terminal user service.");
                return InstallResult.Installed;
            }

            output.WriteLine("JobPilot: no supported service manager here; start the host from setup instead.");
            return InstallResult.Unsupported;
        }
        catch (Exception ex)
        {
            output.WriteLine($"JobPilot: could not install the service: {ex.Message}");
            return InstallResult.Failed;
        }
    }

    public static InstallResult Uninstall(TextWriter output)
    {
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        try
        {
            if (OperatingSystem.IsMacOS())
            {
                var unit = LaunchAgentPath(home);
                Run("launchctl", ["unload", "-w", unit]);
                if (File.Exists(unit)) File.Delete(unit);
                output.WriteLine("JobPilot: removed the launch agent.");
                return InstallResult.Installed;
            }
            if (OperatingSystem.IsLinux())
            {
                Run("systemctl", ["--user", "disable", "--now", "jobpilot-terminal.service"]);
                var unit = SystemdUnitPath(home);
                if (File.Exists(unit)) File.Delete(unit);
                Run("systemctl", ["--user", "daemon-reload"]);
                output.WriteLine("JobPilot: removed the user service.");
                return InstallResult.Installed;
            }
            return InstallResult.Unsupported;
        }
        catch (Exception ex)
        {
            output.WriteLine($"JobPilot: could not remove the service: {ex.Message}");
            return InstallResult.Failed;
        }
    }

    /// <summary>Runs a helper and reports whether it succeeded, draining output so it cannot deadlock.</summary>
    private static (bool Ok, string Detail) Run(string file, string[] arguments)
    {
        try
        {
            var info = new ProcessStartInfo(file)
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            foreach (var argument in arguments)
            {
                info.ArgumentList.Add(argument);
            }

            using var process = Process.Start(info);
            if (process is null)
            {
                return (false, $"could not start {file}");
            }
            var stdout = process.StandardOutput.ReadToEnd();
            var stderr = process.StandardError.ReadToEnd();
            if (!process.WaitForExit(15_000))
            {
                return (false, $"{file} timed out");
            }
            var detail = string.IsNullOrWhiteSpace(stderr) ? stdout.Trim() : stderr.Trim();
            return (process.ExitCode == 0, detail);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    private static string Xml(string value) =>
        value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    /// <summary>`%` is a systemd specifier; a bare one makes the unit fail to load.</summary>
    private static string Systemd(string value) => value.Replace("%", "%%").Replace("\"", "\\\"");
}
