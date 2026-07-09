using JobPilot.Terminal.Contracts;
using Xunit;

namespace JobPilot.Terminal.Tests;

public class TerminalProvidersTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
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
