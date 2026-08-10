using System.Diagnostics;
using System.Text;

namespace JobPilot.Terminal.Hosting;

/// <summary>
/// Registers the host with the OS supervisor so it restarts on crash and comes back after a reboot.
///
/// Until now the host was launched detached and nothing owned its lifetime: one crash - or one
/// stray kill of a parent shell - left the machine with no agent, and the only recovery was a human
/// re-running setup. A supervised service is what makes "the pilot is running" survive the day.
/// </summary>
public static class ServiceInstaller
{
    public const string ServiceLabel = "net.jobpilot.terminal";

    public enum InstallResult
    {
        Installed,
        Unsupported,
        Failed,
    }

    /// <summary>launchd agent for the current user. Not a daemon: the host needs the login session's keychain and PATH.</summary>
    public static string BuildLaunchAgent(string executablePath, string workingDirectory, string logPath)
    {
        return $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
            <plist version="1.0">
            <dict>
              <key>Label</key><string>{ServiceLabel}</string>
              <key>ProgramArguments</key>
              <array>
                <string>{Escape(executablePath)}</string>
              </array>
              <key>WorkingDirectory</key><string>{Escape(workingDirectory)}</string>
              <key>RunAtLoad</key><true/>
              <key>KeepAlive</key><true/>
              <key>ProcessType</key><string>Interactive</string>
              <key>StandardOutPath</key><string>{Escape(logPath)}</string>
              <key>StandardErrorPath</key><string>{Escape(logPath)}</string>
            </dict>
            </plist>

            """;
    }

    /// <summary>systemd *user* unit for the same reason launchd gets an agent, not a daemon.</summary>
    public static string BuildSystemdUnit(string executablePath, string workingDirectory)
    {
        return $"""
            [Unit]
            Description=JobPilot agent terminal host
            After=network.target

            [Service]
            Type=simple
            ExecStart={executablePath}
            WorkingDirectory={workingDirectory}
            Restart=always
            RestartSec=2

            [Install]
            WantedBy=default.target

            """;
    }

    public static string LaunchAgentPath(string home) =>
        Path.Combine(home, "Library", "LaunchAgents", $"{ServiceLabel}.plist");

    public static string SystemdUnitPath(string home) =>
        Path.Combine(home, ".config", "systemd", "user", "jobpilot-terminal.service");

    /// <summary>Writes and loads the unit. Returns Unsupported on platforms without a user supervisor here.</summary>
    public static InstallResult Install(string executablePath, TextWriter output)
    {
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var workingDirectory = Path.GetDirectoryName(executablePath) ?? home;

        try
        {
            if (OperatingSystem.IsMacOS())
            {
                var path = LaunchAgentPath(home);
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                var log = Path.Combine(workingDirectory, "host.log");
                File.WriteAllText(path, BuildLaunchAgent(executablePath, workingDirectory, log), Encoding.UTF8);
                // Unload first so a re-install replaces a stale definition instead of erroring.
                Run("launchctl", $"unload -w \"{path}\"");
                Run("launchctl", $"load -w \"{path}\"");
                output.WriteLine($"JobPilot: installed and started the {ServiceLabel} launch agent.");
                return InstallResult.Installed;
            }

            if (OperatingSystem.IsLinux())
            {
                var path = SystemdUnitPath(home);
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                File.WriteAllText(path, BuildSystemdUnit(executablePath, workingDirectory), Encoding.UTF8);
                Run("systemctl", "--user daemon-reload");
                Run("systemctl", "--user enable --now jobpilot-terminal.service");
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
                var path = LaunchAgentPath(home);
                Run("launchctl", $"unload -w \"{path}\"");
                if (File.Exists(path)) File.Delete(path);
                output.WriteLine("JobPilot: removed the launch agent.");
                return InstallResult.Installed;
            }
            if (OperatingSystem.IsLinux())
            {
                Run("systemctl", "--user disable --now jobpilot-terminal.service");
                var path = SystemdUnitPath(home);
                if (File.Exists(path)) File.Delete(path);
                Run("systemctl", "--user daemon-reload");
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

    /// <summary>Best effort: `unload` of a missing agent is an expected non-zero, not a failure.</summary>
    private static void Run(string file, string arguments)
    {
        try
        {
            using var process = Process.Start(new ProcessStartInfo(file, arguments)
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            });
            process?.WaitForExit(10_000);
        }
        catch
        {
        }
    }

    private static string Escape(string value) =>
        value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
}
