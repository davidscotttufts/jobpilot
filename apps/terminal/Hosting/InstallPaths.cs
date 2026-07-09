namespace JobPilot.Terminal.Hosting;

/// <summary>
/// Resolved filesystem paths of a JobPilot install. Pure data, and foundational: nothing here depends on
/// sessions, updates, or the provider table, so every layer can build on it without referencing each other.
/// </summary>
public sealed record InstallPaths
{
    /// <summary>Default working directory for a launched session.</summary>
    public required string WorkingDir { get; init; }

    /// <summary>Shared skills tree (plugin/skills).</summary>
    public required string SharedSkillsDir { get; init; }

    /// <summary>Plugin dir Claude loads (holds .claude-plugin/).</summary>
    public required string ClaudePluginDir { get; init; }

    /// <summary>Plugin dir Codex loads (holds .codex-plugin/); same tree as Claude's.</summary>
    public required string CodexPluginDir { get; init; }

    /// <summary>
    /// Finds the JobPilot repository/plugin layout from the current process location.
    /// </summary>
    public static InstallPaths Resolve()
    {
        return ResolveFrom(CandidateRoots());
    }

    /// <summary>Probes <paramref name="candidateRoots"/> in order for a valid plugin layout. Seam for tests.</summary>
    internal static InstallPaths ResolveFrom(IEnumerable<string> candidateRoots)
    {
        var roots = candidateRoots.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

        // Both providers load from a single plugin/ directory holding the
        // .claude-plugin/ and .codex-plugin/ manifests, the shared skills/ tree,
        // and .mcp.json. The same layout is used in dev (repo root) and in the
        // published output root.
        foreach (var root in roots)
        {
            var pluginDir = Path.Combine(root, "plugin");
            var skillsDir = Path.Combine(pluginDir, "skills");

            if (IsSharedSkillsDir(skillsDir)
                && IsClaudePluginDir(pluginDir)
                && IsCodexPluginDir(pluginDir))
            {
                return new InstallPaths
                {
                    WorkingDir = root,
                    SharedSkillsDir = skillsDir,
                    ClaudePluginDir = pluginDir,
                    CodexPluginDir = pluginDir,
                };
            }
        }

        throw new DirectoryNotFoundException(
            "Could not find JobPilot provider assets: a plugin/ directory with skills/, .claude-plugin/, and .codex-plugin/.");
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

    private static bool IsSharedSkillsDir(string path)
    {
        // Single tree: shared/ docs + one dir per skill (e.g. auto-apply/SKILL.md).
        return File.Exists(Path.Combine(path, "shared", "setup.md"))
            && File.Exists(Path.Combine(path, "auto-apply", "SKILL.md"));
    }

    private static bool IsClaudePluginDir(string path)
    {
        return File.Exists(Path.Combine(path, ".claude-plugin", "plugin.json"));
    }

    private static bool IsCodexPluginDir(string path)
    {
        return File.Exists(Path.Combine(path, ".codex-plugin", "plugin.json"));
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
