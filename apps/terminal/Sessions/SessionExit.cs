namespace JobPilot.Terminal.Sessions;

/// <summary>A session's process has exited.</summary>
/// <param name="ProviderDisplayName">User-facing provider name, e.g. "Claude Code".</param>
/// <param name="ExitCode">Process exit code.</param>
public readonly record struct SessionExit(string ProviderDisplayName, int ExitCode);
