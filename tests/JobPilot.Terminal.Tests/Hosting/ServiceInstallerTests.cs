using System.Xml.Linq;
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

    private const string Path = "/opt/homebrew/bin:/Users/x/.local/bin:/usr/bin:/bin";

    [Fact]
    public void LaunchAgentRestartsOnCrashAndAtLogin()
    {
        var plist = Agent();

        Assert.Contains("<key>RunAtLoad</key><true/>", plist);
        Assert.Contains(Exe, plist);
        Assert.Contains(ServiceInstaller.ServiceLabel, plist);
    }

    /// <summary>
    /// The host exits 0 on purpose twice - the self-update handoff relaunches a replacement that
    /// binds :4102 itself, and the dashboard Stop button. A blanket KeepAlive respawns a rival for
    /// the port after every update and makes Stop impossible to obey.
    /// </summary>
    [Fact]
    public void LaunchAgentDoesNotResurrectADeliberateExit()
    {
        var plist = Agent();

        Assert.DoesNotContain("<key>KeepAlive</key><true/>", plist);
        var keepAlive = XDocument.Parse(plist)
            .Descendants("key")
            .First(k => k.Value == "KeepAlive")
            .ElementsAfterSelf()
            .First();
        Assert.Equal("dict", keepAlive.Name.LocalName);
        Assert.Equal("SuccessfulExit", keepAlive.Element("key")!.Value);
        Assert.Equal("false", keepAlive.Elements().Last().Name.LocalName);
    }

    /// <summary>
    /// A launch agent inherits launchd's environment, not the login shell's, and the host spawns
    /// `claude`/`codex` by bare name - without an explicit PATH every session it starts dies with
    /// command-not-found while /healthz stays green.
    /// </summary>
    [Fact]
    public void LaunchAgentCarriesThePathTheAgentCliNeeds()
    {
        var plist = Agent();

        Assert.Contains("EnvironmentVariables", plist);
        Assert.Contains("/Users/x/.local/bin", plist);
    }

    [Fact]
    public void LaunchAgentIsValidXml()
    {
        // Makes the manual `plutil -lint` step permanent: launchd rejects a malformed plist silently.
        var document = XDocument.Parse(Agent());

        Assert.Equal("plist", document.Root!.Name.LocalName);
    }

    private static string Agent() =>
        ServiceInstaller.BuildLaunchAgent(Exe, "/Users/x/.jobpilot", "/Users/x/.jobpilot/host.log", Path);

    [Fact]
    public void LaunchAgentCapturesOutputSoAFailingHostIsDiagnosable()
    {
        var plist = Agent();

        Assert.Contains("StandardOutPath", plist);
        Assert.Contains("StandardErrorPath", plist);
        Assert.Contains("/Users/x/.jobpilot/host.log", plist);
    }

    [Fact]
    public void LaunchAgentEscapesPathsThatWouldBreakThePlist()
    {
        var plist = ServiceInstaller.BuildLaunchAgent(
            "/Users/a&b/jobpilot", "/Users/a&b", "/Users/a&b/host.log", Path);

        // A raw ampersand makes the plist unparseable, and launchd would refuse it silently.
        Assert.Contains("/Users/a&amp;b/jobpilot", plist);
        XDocument.Parse(plist);
    }

    [Fact]
    public void SystemdUnitRestartsOnFailureOnly()
    {
        var unit = ServiceInstaller.BuildSystemdUnit(Exe, "/home/x/.jobpilot", Path);

        // `always` would fight the self-update handoff and the Stop button, as on macOS.
        Assert.Contains("Restart=on-failure", unit);
        Assert.DoesNotContain("Restart=always", unit);
        Assert.Contains(Exe, unit);
        Assert.Contains("WantedBy=default.target", unit);
        Assert.Contains("/Users/x/.local/bin", unit);
    }

    /// <summary>
    /// systemd splits ExecStart on whitespace and reads `%` as a specifier: a space in a home
    /// directory execs the wrong binary, and a bare `%` makes the unit fail to load outright.
    /// Either one restart-loops every two seconds forever.
    /// </summary>
    [Fact]
    public void SystemdUnitSurvivesSpacesAndPercentsInPaths()
    {
        var unit = ServiceInstaller.BuildSystemdUnit(
            "/home/John Smith/100%/jobpilot", "/home/John Smith/100%", Path);

        Assert.Contains("ExecStart=\"/home/John Smith/100%%/jobpilot\"", unit);
        Assert.DoesNotContain("100%/", unit);
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
