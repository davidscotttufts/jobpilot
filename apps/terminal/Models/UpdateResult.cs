namespace JobPilot.Terminal.Models;

/// <summary>Result of a runtime <c>POST /update</c> request (failures surface as <c>ProblemDetails</c> instead).</summary>
public sealed record UpdateResult
{
    /// <summary>True when a swap+relaunch was performed and the host is shutting down to hand off the port.</summary>
    public required bool Updating { get; init; }

    /// <summary>Version currently running (pre-swap).</summary>
    public required string FromVersion { get; init; }

    /// <summary>Version being launched, when <see cref="Updating"/>; null when already current or blocked.</summary>
    public string? ToVersion { get; init; }

    /// <summary>Machine-readable reason when not updating: <c>up-to-date</c> / <c>dev-checkout</c> / <c>in-progress</c> / <c>no-asset</c>.</summary>
    public string? Reason { get; init; }
}
