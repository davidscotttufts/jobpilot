using JobPilot.Terminal.Contracts;
using Xunit;

namespace JobPilot.Terminal.Tests;

/// <summary>Characterizes provider id normalization and display naming. These pin the behaviour that the
/// provider-registry consolidation must preserve.</summary>
public class TerminalProvidersTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")] // Trim() runs before the switch, so whitespace collapses to the empty arm.
    public void Normalize_DefaultsToClaude_WhenAbsent(string? provider)
    {
        Assert.Equal(TerminalProviders.Claude, TerminalProviders.Normalize(provider));
    }

    [Theory]
    [InlineData("claude", TerminalProviders.Claude)]
    [InlineData("CLAUDE", TerminalProviders.Claude)]
    [InlineData("  Claude  ", TerminalProviders.Claude)]
    [InlineData("codex", TerminalProviders.Codex)]
    [InlineData("CoDeX", TerminalProviders.Codex)]
    public void Normalize_IsCaseInsensitiveAndTrims(string input, string expected)
    {
        Assert.Equal(expected, TerminalProviders.Normalize(input));
    }

    [Theory]
    [InlineData("gemini")]
    [InlineData("claude-code")]
    public void Normalize_Throws_ForUnknownProvider(string input)
    {
        Assert.Throws<ArgumentException>(() => TerminalProviders.Normalize(input));
    }

    [Theory]
    [InlineData(TerminalProviders.Claude, "Claude Code")]
    [InlineData(TerminalProviders.Codex, "Codex")]
    public void GetDisplayName_MapsKnownProviders(string id, string expected)
    {
        Assert.Equal(expected, TerminalProviders.GetDisplayName(id));
    }

    [Fact]
    public void GetDisplayName_Throws_ForUnknownProvider()
    {
        Assert.Throws<ArgumentException>(() => TerminalProviders.GetDisplayName("gemini"));
    }

    [Fact]
    public void Supported_ExposesEveryProviderInTheTable()
    {
        Assert.Equal(
            [("claude", "Claude Code"), ("codex", "Codex")],
            TerminalProviders.Supported().Select(p => (p.Id, p.DisplayName)));
    }

    [Fact]
    public void Supported_AgreesWithNormalizeAndGetDisplayName()
    {
        // Normalize, GetDisplayName, Supported and the launch spec used to be four switches that could
        // silently disagree. They now derive from one table; this pins that they stay in step.
        foreach (var provider in TerminalProviders.Supported())
        {
            Assert.Equal(provider.Id, TerminalProviders.Normalize(provider.Id));
            Assert.Equal(provider.DisplayName, TerminalProviders.GetDisplayName(provider.Id));
        }
    }

    [Fact]
    public void GetLaunchSpec_Claude_SkipsPermissionsAndPointsAtThePluginDir()
    {
        var spec = TerminalProviders.GetLaunchSpec(TerminalProviders.Claude, "/plugin", "/cwd");

        Assert.Equal("claude", spec.Command);
        Assert.Equal(["--dangerously-skip-permissions", "--plugin-dir", "/plugin"], spec.Args);
        Assert.Equal("Claude Code", spec.Provider.DisplayName);
    }

    [Fact]
    public void GetLaunchSpec_Codex_DisablesAltScreenAndPassesTheWorkingDir()
    {
        var spec = TerminalProviders.GetLaunchSpec(TerminalProviders.Codex, "/plugin", "/cwd");

        Assert.Equal("codex", spec.Command);
        Assert.Equal(["--no-alt-screen", "-C", "/cwd"], spec.Args);
        Assert.Equal("Codex", spec.Provider.DisplayName);
    }

    [Fact]
    public void GetLaunchSpec_DefaultsToClaude_WhenProviderIsAbsent()
    {
        Assert.Equal("claude", TerminalProviders.GetLaunchSpec(null, "/plugin", "/cwd").Command);
    }

    [Fact]
    public void GetLaunchSpec_Throws_ForAnUnknownProvider()
    {
        Assert.Throws<ArgumentException>(() => TerminalProviders.GetLaunchSpec("gemini", "/plugin", "/cwd"));
    }
}
