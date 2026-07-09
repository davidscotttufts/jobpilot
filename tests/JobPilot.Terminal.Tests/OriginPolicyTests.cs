using JobPilot.Terminal.Hosting;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace JobPilot.Terminal.Tests;

/// <summary>The host spawns an agent with --dangerously-skip-permissions, so the allowlist is the only thing
/// standing between a visited web page and command execution on the user's machine.</summary>
public class OriginPolicyTests
{
    private static IConfiguration Config(params string[] origins)
    {
        var values = origins
            .Select((o, i) => new KeyValuePair<string, string?>($"Terminal:AllowedOrigins:{i}", o));
        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    [Fact]
    public void Resolve_FallsBackToDevAndHostedWeb_WhenUnconfigured()
    {
        var origins = OriginPolicy.Resolve(Config());

        Assert.Equal(["http://localhost:4100", "https://jobpilot.suxrobgm.net"], origins);
    }

    [Fact]
    public void Resolve_UsesTheConfiguredAllowlist()
    {
        var origins = OriginPolicy.Resolve(Config("https://example.test"));

        Assert.Equal(["https://example.test"], origins);
    }

    [Fact]
    public void Resolve_StripsTrailingSlashes_BecauseOriginHeadersNeverCarryThem()
    {
        var origins = OriginPolicy.Resolve(Config("https://example.test/"));

        Assert.Equal(["https://example.test"], origins);
    }

    [Fact]
    public void Resolve_DeduplicatesCaseInsensitively()
    {
        var origins = OriginPolicy.Resolve(Config("https://Example.test", "https://example.test/"));

        Assert.Equal(["https://Example.test"], origins);
    }

    [Fact]
    public void Resolve_NeverReturnsAWildcard()
    {
        Assert.DoesNotContain("*", OriginPolicy.Resolve(Config()));
    }
}
