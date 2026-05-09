namespace JobPilot.Terminal.Models;

/// <summary>
/// Request body used to inject a command into the active terminal session.
/// </summary>
/// <param name="Command">Command text to write to the PTY.</param>
public sealed record InjectRequest(string Command);
