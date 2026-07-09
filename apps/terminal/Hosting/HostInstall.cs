namespace JobPilot.Terminal.Hosting;

/// <summary>
/// Identity of this installation: where its assets live, whether it can self-update, and what version it is.
/// Foundational - sessions and updates both depend on it, and it depends on neither.
/// </summary>
public sealed class HostInstall
{
    /// <summary>Resolves the install layout once. Never throws: a broken install must report itself as
    /// degraded rather than 500 on /healthz, or the dashboard reads a running host as offline.</summary>
    public HostInstall(ILogger<HostInstall> logger)
    {
        try
        {
            Paths = InstallPaths.Resolve();
        }
        catch (Exception ex)
        {
            PathsError = ex.Message;
            logger.LogError(ex, "Terminal host install is incomplete; sessions cannot start.");
        }

        CanUpdate = Paths is not null && IsPublishedInstall(Paths.ClaudePluginDir);
    }

    /// <summary>Test seam: build an install around a known layout without touching the filesystem probe.</summary>
    internal HostInstall(InstallPaths? paths, string? pathsError = null, bool canUpdate = false)
    {
        Paths = paths;
        PathsError = pathsError;
        CanUpdate = canUpdate;
    }

    /// <summary>Resolved asset locations, or null when the plugin tree could not be found.</summary>
    public InstallPaths? Paths { get; }

    /// <summary>Non-null when <see cref="Paths"/> could not be resolved; surfaced as /healthz "degraded".</summary>
    public string? PathsError { get; }

    /// <summary>True when this is a published install rather than a dev checkout, so the host may self-update.</summary>
    public bool CanUpdate { get; }

    /// <summary>Host version (from the assembly), reported by /healthz so the dashboard can detect a stale install.</summary>
    public static string HostVersion { get; } =
        typeof(HostInstall).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";

    /// <summary>The resolved paths, or a diagnosable failure explaining that the install is incomplete.</summary>
    public InstallPaths RequirePaths() => Paths ?? throw new InvalidOperationException(
        $"Terminal host install is incomplete - reinstall the JobPilot agent. ({PathsError})");

    /// <summary>
    /// True when <paramref name="path"/> sits under the running binary's directory; false in a dev checkout,
    /// where assets resolve to the repo root. Guards the updaters from overwriting a source tree.
    /// </summary>
    internal static bool IsPublishedInstall(string path)
    {
        var baseDir = Path.GetFullPath(AppContext.BaseDirectory);
        return Path.GetFullPath(path).StartsWith(baseDir, StringComparison.OrdinalIgnoreCase);
    }
}
