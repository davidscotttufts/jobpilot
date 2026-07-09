namespace JobPilot.Terminal.Contracts;

/// <summary>
/// User-facing provider metadata returned to the web app.
/// </summary>
/// <param name="Id">Stable provider id used by API requests.</param>
/// <param name="DisplayName">Label shown in the terminal UI.</param>
public sealed record TerminalProviderInfo(string Id, string DisplayName);

/// <summary>
/// Command and argument details used to launch a provider process.
/// </summary>
/// <param name="Provider">Provider metadata.</param>
/// <param name="Command">Executable to spawn.</param>
/// <param name="Args">Arguments passed to the executable.</param>
public sealed record TerminalLaunchSpec(TerminalProviderInfo Provider, string Command, string[] Args);

/// <summary>
/// The supported AI terminal providers, and everything that varies between them.
/// </summary>
/// <remarks>
/// One entry per provider. Id normalization, display names, the <c>/healthz</c> provider list, and the launch
/// argv are all derived from this table, so adding a provider is a single edit rather than four switches that
/// can silently disagree.
/// </remarks>
public static class TerminalProviders
{
    public const string Claude = "claude";
    public const string Codex = "codex";

    /// <param name="Id">Stable provider id.</param>
    /// <param name="DisplayName">Label shown in the terminal UI.</param>
    /// <param name="Command">Executable to spawn.</param>
    /// <param name="BuildArgs">Arguments, from (pluginDir, workingDir).</param>
    private sealed record Definition(
        string Id,
        string DisplayName,
        string Command,
        Func<string, string, string[]> BuildArgs);

    private static readonly Definition[] All =
    [
        new(Claude, "Claude Code", "claude",
            (pluginDir, _) => ["--dangerously-skip-permissions", "--plugin-dir", pluginDir]),
        new(Codex, "Codex", "codex",
            (_, workingDir) => ["--no-alt-screen", "-C", workingDir]),
    ];

    /// <summary>The table projected for UI discovery. Constant, so it is built once rather than per /healthz poll.</summary>
    private static readonly TerminalProviderInfo[] SupportedProviders =
        [.. All.Select(p => new TerminalProviderInfo(p.Id, p.DisplayName))];

    /// <summary>Canonical id for a caller-supplied provider. Absent means Claude.</summary>
    /// <exception cref="ArgumentException">The id is not a known provider.</exception>
    public static string Normalize(string? provider)
    {
        var trimmed = provider?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(trimmed))
        {
            return Claude;
        }

        return Find(trimmed).Id;
    }

    /// <summary>
    /// Returns the user-facing display name for a normalized provider id.
    /// </summary>
    /// <exception cref="ArgumentException">The id is not a known provider.</exception>
    public static string GetDisplayName(string id) => Find(id).DisplayName;

    /// <summary>Every supported provider, for UI discovery.</summary>
    public static TerminalProviderInfo[] Supported() => SupportedProviders;

    /// <summary>
    /// Builds the command and argv for a provider.
    /// </summary>
    /// <param name="provider">Provider id, or null for the default.</param>
    /// <param name="pluginDir">Resolved plugin directory, for providers that must be pointed at it.</param>
    /// <param name="workingDir">Working directory of the session.</param>
    /// <exception cref="ArgumentException">The provider id is not a known provider.</exception>
    public static TerminalLaunchSpec GetLaunchSpec(string? provider, string pluginDir, string workingDir)
    {
        var definition = Find(Normalize(provider));
        return new TerminalLaunchSpec(
            new TerminalProviderInfo(definition.Id, definition.DisplayName),
            definition.Command,
            definition.BuildArgs(pluginDir, workingDir));
    }

    private static Definition Find(string id)
    {
        foreach (var definition in All)
        {
            if (definition.Id == id)
            {
                return definition;
            }
        }

        throw new ArgumentException($"Unsupported terminal provider '{id}'.");
    }
}
