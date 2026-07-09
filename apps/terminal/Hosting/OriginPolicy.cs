namespace JobPilot.Terminal.Hosting;

/// <summary>
/// Browser origins allowed to drive this host. The host spawns an agent with
/// <c>--dangerously-skip-permissions</c>, so an unrestricted origin lets any page the user visits inject
/// shell commands. Requests carrying no <c>Origin</c> header (curl, the setup skill) are still allowed -
/// they are not browser-initiated and cannot be forged cross-site.
/// </summary>
public static class OriginPolicy
{
    /// <summary>Named CORS policy applied to the whole app.</summary>
    public const string CorsPolicy = "jobpilot-web";

    private const string ConfigKey = "Terminal:AllowedOrigins";

    private static readonly string[] Defaults =
    [
        "http://localhost:4100",
        "https://jobpilot.suxrobgm.net",
    ];

    /// <summary>Reads the allowlist from <c>Terminal:AllowedOrigins</c>, falling back to dev + hosted web.</summary>
    public static string[] Resolve(IConfiguration configuration)
    {
        // Walk the children rather than Get<string[]>(): reflection binding is not NativeAOT-safe.
        string[] configured =
        [
            .. configuration.GetSection(ConfigKey).GetChildren()
                .Select(child => child.Value)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!),
        ];

        var origins = configured.Length > 0 ? configured : Defaults;

        // Kestrel compares Origin headers verbatim; a trailing slash never matches.
        return [.. origins.Select(o => o.TrimEnd('/')).Distinct(StringComparer.OrdinalIgnoreCase)];
    }
}
