namespace JobPilot.Terminal;

/// <summary>
/// Resolved filesystem paths used to launch the embedded Claude Code session.
/// </summary>
public sealed record TerminalSessionPaths(string WorkingDir, string PluginDir)
{
    /// <summary>
    /// Finds the JobPilot repository/plugin layout from the current process location.
    /// </summary>
    public static TerminalSessionPaths Resolve()
    {
        var roots = CandidateRoots().Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

        foreach (var root in roots)
        {
            var sourcePluginDir = Path.Combine(root, "src", "jobpilot-claude-plugin");
            if (IsPluginDir(sourcePluginDir))
            {
                return new TerminalSessionPaths(root, sourcePluginDir);
            }
        }

        throw new DirectoryNotFoundException(
            "Could not find the JobPilot Claude plugin at src/jobpilot-claude-plugin or jobpilot-claude-plugin.");
    }

    /// <summary>
    /// Resolves an optional client-provided working directory against this session's default.
    /// </summary>
    public string ResolveWorkingDir(string? requestedWorkingDir)
    {
        return string.IsNullOrWhiteSpace(requestedWorkingDir)
            ? WorkingDir
            : Path.GetFullPath(requestedWorkingDir);
    }

    private static IEnumerable<string> CandidateRoots()
    {
        foreach (var root in Ancestors(Environment.CurrentDirectory))
        {
            yield return root;
        }

        foreach (var root in Ancestors(AppContext.BaseDirectory))
        {
            yield return root;
        }
    }

    private static bool IsPluginDir(string path)
    {
        return File.Exists(Path.Combine(path, ".claude-plugin", "plugin.json"));
    }

    private static IEnumerable<string> Ancestors(string path)
    {
        var directory = new DirectoryInfo(Path.GetFullPath(path));
        while (directory is not null)
        {
            yield return directory.FullName;
            directory = directory.Parent;
        }
    }
}
