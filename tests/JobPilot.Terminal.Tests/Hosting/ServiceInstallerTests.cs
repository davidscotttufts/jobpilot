using JobPilot.Terminal.Hosting;
using Xunit;

namespace JobPilot.Terminal.Tests;

/// <summary>
/// The host used to be launched detached with nothing owning its lifetime, so one crash left the
/// machine with no agent until a human re-ran setup. These cover the unit definitions themselves -
/// loading them is the OS's job, but the restart directives are the whole point of the change.
/// </summary>
public sealed class ServiceInstallerTests
{
    private const string Exe = "/Users/x/.jobpilot/jobpilot";

    [Fact]
    public void LaunchAgentRestartsOnCrashAndAtLogin()
    {
        var plist = ServiceInstaller.BuildLaunchAgent(Exe, "/Users/x/.jobpilot", "/Users/x/.jobpilot/host.log");

        // Both matter: KeepAlive covers a crash, RunAtLoad covers a reboot.
        Assert.Contains("<key>KeepAlive</key><true/>", plist);
        Assert.Contains("<key>RunAtLoad</key><true/>", plist);
        Assert.Contains(Exe, plist);
        Assert.Contains(ServiceInstaller.ServiceLabel, plist);
    }

    [Fact]
    public void LaunchAgentCapturesOutputSoAFailingHostIsDiagnosable()
    {
        var plist = ServiceInstaller.BuildLaunchAgent(Exe, "/Users/x/.jobpilot", "/Users/x/.jobpilot/host.log");

        Assert.Contains("StandardOutPath", plist);
        Assert.Contains("StandardErrorPath", plist);
        Assert.Contains("/Users/x/.jobpilot/host.log", plist);
    }

    [Fact]
    public void LaunchAgentEscapesPathsThatWouldBreakThePlist()
    {
        var plist = ServiceInstaller.BuildLaunchAgent("/Users/a&b/jobpilot", "/Users/a&b", "/Users/a&b/host.log");

        // A raw ampersand makes the plist unparseable, and launchd would refuse it silently.
        Assert.DoesNotContain("/Users/a&b", plist);
        Assert.Contains("/Users/a&amp;b/jobpilot", plist);
    }

    [Fact]
    public void SystemdUnitAlwaysRestarts()
    {
        var unit = ServiceInstaller.BuildSystemdUnit(Exe, "/home/x/.jobpilot");

        Assert.Contains("Restart=always", unit);
        Assert.Contains($"ExecStart={Exe}", unit);
        Assert.Contains("WantedBy=default.target", unit);
    }

    [Fact]
    public void UnitsLandInPerUserLocations()
    {
        // A user agent, not a system daemon: the host needs the login session's keychain and PATH.
        Assert.Equal(
            "/Users/x/Library/LaunchAgents/net.jobpilot.terminal.plist",
            ServiceInstaller.LaunchAgentPath("/Users/x"));
        Assert.Equal(
            "/home/x/.config/systemd/user/jobpilot-terminal.service",
            ServiceInstaller.SystemdUnitPath("/home/x"));
    }
}
