using JobPilot.Terminal.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace JobPilot.Terminal.Tests;

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

    [Fact]
    public async Task Guard_AllowsConfiguredOrigin()
    {
        var (status, reachedEndpoint) = await InvokeGuardAsync("https://example.test");

        Assert.Equal(StatusCodes.Status200OK, status);
        Assert.True(reachedEndpoint);
    }

    [Fact]
    public async Task Guard_AllowsRequestsWithoutOrigin()
    {
        var (status, reachedEndpoint) = await InvokeGuardAsync(origin: null);

        Assert.Equal(StatusCodes.Status200OK, status);
        Assert.True(reachedEndpoint);
    }

    [Fact]
    public async Task Guard_RejectsDisallowedOriginBeforeEndpoint()
    {
        var (status, reachedEndpoint) = await InvokeGuardAsync("https://attacker.test");

        Assert.Equal(StatusCodes.Status403Forbidden, status);
        Assert.False(reachedEndpoint);
    }

    private static async Task<(int Status, bool ReachedEndpoint)> InvokeGuardAsync(string? origin)
    {
        var reachedEndpoint = false;
        var context = new DefaultHttpContext();
        if (origin is not null)
        {
            context.Request.Headers.Origin = origin;
        }

        var guard = OriginPolicy.CreateGuard(
            Config("https://example.test"),
            _ =>
            {
                reachedEndpoint = true;
                return Task.CompletedTask;
            });

        await guard(context);
        return (context.Response.StatusCode, reachedEndpoint);
    }
}
