namespace JobPilot.Terminal.Sessions;

/// <summary>Outcome of injecting a command into the active session. The two rejections share a 409 on the
/// wire, but are distinct in the logs.</summary>
public enum InjectResult
{
    /// <summary>The command and its submit key reached the PTY.</summary>
    Injected,

    /// <summary>No session was running, or it ended before the submit key was sent.</summary>
    NotRunning,

    /// <summary>A session was running, but under a different provider than the caller expected.</summary>
    ProviderMismatch,
}
