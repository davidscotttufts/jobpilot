using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Terminal.Models;

/// <summary>
/// Source-generated JSON metadata used by the Native AOT terminal host.
/// </summary>
[JsonSerializable(typeof(StartSessionRequest))]
[JsonSerializable(typeof(InjectRequest))]
[JsonSerializable(typeof(SessionStatus))]
[JsonSerializable(typeof(UpdateResult))]
[JsonSerializable(typeof(TerminalProviderInfo))]
[JsonSerializable(typeof(TerminalProviderInfo[]))]
// TypedResults.Problem returns this; the AOT serializer throws NotSupportedException without it.
[JsonSerializable(typeof(ProblemDetails))]
// Auto-update: the GitHub releases listing.
[JsonSerializable(typeof(GitHubRelease[]))]
internal sealed partial class AppJsonContext : JsonSerializerContext;
