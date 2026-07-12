namespace JobPilot.Terminal.Hosting;

/// <summary>Resolved host installation and update capability.</summary>
public sealed class HostInstall
{
    /// <summary>Resolves the layout without preventing a degraded host from starting.</summary>
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

        CanUpdate = Paths is not null && IsPublishedHost;
    }

    internal HostInstall(InstallPaths? paths, string? pathsError = null, bool canUpdate = false)
    {
        Paths = paths;
        PathsError = pathsError;
        CanUpdate = canUpdate;
    }

    /// <summary>Resolved asset locations, or null when the plugin tree could not be found.</summary>
    public InstallPaths? Paths { get; }

    /// <summary>Layout resolution error, if any.</summary>
    public string? PathsError { get; }

    /// <summary>Whether this is a published, self-updatable install.</summary>
    public bool CanUpdate { get; }

    /// <summary>Host assembly version.</summary>
    public static string HostVersion { get; } =
        typeof(HostInstall).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";

    /// <summary>
    /// Whether the running executable ships its own plugin tree - a published install rather than a
    /// build output, which resolves the repo's tree from an ancestor directory.
    /// </summary>
    public static bool IsPublishedHost { get; } = InstallPaths.IsInstallRoot(AppContext.BaseDirectory);

    /// <summary>Returns the paths or throws the recorded resolution error.</summary>
    public InstallPaths RequirePaths() => Paths ?? throw new InvalidOperationException(
        $"Terminal host install is incomplete - reinstall the JobPilot agent. ({PathsError})");
}
