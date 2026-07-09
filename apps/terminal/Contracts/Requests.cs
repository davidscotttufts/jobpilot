using System.Text.Json.Serialization;

namespace JobPilot.Terminal.Contracts;

/// <summary>
/// Request body used to start a terminal session with an initial viewport size.
/// </summary>
public sealed record StartSessionRequest
{
    /// <summary>Initial terminal column count.</summary>
    public int Cols { get; init; }

    /// <summary>Initial terminal row count.</summary>
    public int Rows { get; init; }

    /// <summary>Optional terminal provider id. Defaults to Claude.</summary>
    public string? Provider { get; init; }

    /// <summary>Optional per-user agent PAT, injected into the PTY as JOBPILOT_API_TOKEN.</summary>
    public string? ApiToken { get; init; }

    /// <summary>Optional web app origin (the browser's location), injected into the PTY as JOBPILOT_WEB for user-facing links.</summary>
    public string? WebUrl { get; init; }

    /// <summary>Optional backend base URL (the web app's configured API origin), injected into the PTY as
    /// JOBPILOT_API. Lets a hosted web point the local agent at the remote API instead of localhost.</summary>
    public string? ApiUrl { get; init; }
}

/// <summary>
/// Request body used to inject a command into the active terminal session.
/// </summary>
/// <param name="Command">Command text to write to the PTY. Validated at the endpoint - a <c>{}</c> body binds it to null.</param>
/// <param name="Provider">Optional provider id for the intended session.</param>
public sealed record InjectRequest(string? Command, string? Provider = null);

/// <summary>
/// A control message sent by the browser over <c>/ws</c>.
/// </summary>
/// <remarks>
/// The property names are spelled out rather than left to a naming policy. This type is deserialized directly
/// against <c>AppJsonContext</c>, not through the ASP.NET pipeline, so it does not inherit the pipeline's
/// camelCase web defaults - without these attributes every field would silently bind to null.
/// </remarks>
public sealed record TerminalClientMessage
{
    /// <summary>Message kind: <c>input</c> or <c>resize</c>. Anything else is ignored.</summary>
    [JsonPropertyName("type")]
    public string? Type { get; init; }

    /// <summary>For <c>input</c>: base64-encoded raw terminal bytes.</summary>
    [JsonPropertyName("data")]
    public string? Data { get; init; }

    /// <summary>For <c>resize</c>: new column count.</summary>
    [JsonPropertyName("cols")]
    public int? Cols { get; init; }

    /// <summary>For <c>resize</c>: new row count.</summary>
    [JsonPropertyName("rows")]
    public int? Rows { get; init; }
}
