namespace JobPilot.Terminal.Contracts;

/// <summary>
/// Health and lifecycle status returned by terminal session endpoints.
/// </summary>
public sealed record SessionStatus
{
    /// <summary>The host runs and can start sessions.</summary>
    public const string StatusOk = "ok";

    /// <summary>The host runs but cannot start sessions, e.g. the plugin tree is missing.</summary>
    public const string StatusDegraded = "degraded";

    public const string SessionRunning = "running";
    public const string SessionStopped = "stopped";

    /// <summary>API status value: <see cref="StatusOk"/> or <see cref="StatusDegraded"/>.</summary>
    public required string Status { get; init; }

    /// <summary>Current terminal session state: <see cref="SessionRunning"/> or <see cref="SessionStopped"/>.</summary>
    public required string Session { get; init; }

    /// <summary>Current or last requested terminal provider.</summary>
    public required string Provider { get; init; }

    /// <summary>Supported provider metadata for clients.</summary>
    public required TerminalProviderInfo[] Providers { get; init; }

    /// <summary>The host binary version. The dashboard compares it to the latest terminal release to prompt a
    /// re-install; the plugin self-updates at startup, so it is not here.</summary>
    public required string HostVersion { get; init; }

    /// <summary>Human-readable reason when <see cref="Status"/> is <see cref="StatusDegraded"/>.</summary>
    public string? Detail { get; init; }

    /// <summary>True when the <c>jobpilot://</c> scheme is registered, so the dashboard can offer a one-click
    /// relaunch when the host is offline.</summary>
    public bool CanRelaunch { get; init; }

    /// <summary>True when this is a published install (not a dev checkout), so the dashboard can offer a
    /// one-click self-update via <c>POST /update</c>.</summary>
    public bool CanUpdate { get; init; }
}

/// <summary>Result of a runtime <c>POST /update</c> request (failures surface as <c>ProblemDetails</c> instead).</summary>
public sealed record UpdateResult
{
    /// <summary>Machine-readable reasons for not updating. The web types these as a closed union.</summary>
    public const string ReasonUpToDate = "up-to-date";
    public const string ReasonDevCheckout = "dev-checkout";
    public const string ReasonInProgress = "in-progress";
    public const string ReasonNoAsset = "no-asset";

    /// <summary>True when a swap+relaunch was performed and the host is shutting down to hand off the port.</summary>
    public required bool Updating { get; init; }

    /// <summary>Version currently running (pre-swap).</summary>
    public required string FromVersion { get; init; }

    /// <summary>Version being launched, when <see cref="Updating"/>; null when already current or blocked.</summary>
    public string? ToVersion { get; init; }

    /// <summary>Machine-readable reason when not updating.</summary>
    public string? Reason { get; init; }
}
