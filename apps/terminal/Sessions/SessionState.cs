namespace JobPilot.Terminal.Sessions;

/// <summary>
/// Tracks whether the managed terminal process is currently available.
/// </summary>
public enum SessionState
{
    /// <summary>No terminal process is running.</summary>
    Stopped,

    /// <summary>A terminal process is running and may receive input.</summary>
    Running
}
