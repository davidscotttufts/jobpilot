namespace JobPilot.Terminal.Sessions;

/// <summary>Command injection result.</summary>
public enum InjectResult
{
    Injected,

    NotRunning,

    ProviderMismatch,
}
