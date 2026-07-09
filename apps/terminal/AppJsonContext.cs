using System.Text.Json.Serialization;
using JobPilot.Terminal.Contracts;
using JobPilot.Terminal.Updates;
using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Terminal;

/// <summary>
/// Source-generated JSON metadata used by the Native AOT terminal host. Every type serialized anywhere must be
/// listed here, or AOT throws <see cref="NotSupportedException"/> at runtime (under JIT the reflection resolver
/// silently covers the gap, so only a real AOT publish catches an omission).
/// </summary>
/// <remarks>
/// The camelCase policy matters for types serialized <em>directly</em> against this context rather than through
/// the ASP.NET pipeline (which supplies its own web defaults): the WebSocket messages and the exception
/// handler's ProblemDetails. Without it those would use PascalCase and the web would not recognize them.
/// </remarks>
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(StartSessionRequest))]
[JsonSerializable(typeof(InjectRequest))]
[JsonSerializable(typeof(TerminalClientMessage))]
[JsonSerializable(typeof(SessionStatus))]
[JsonSerializable(typeof(UpdateResult))]
[JsonSerializable(typeof(TerminalProviderInfo))]
[JsonSerializable(typeof(TerminalProviderInfo[]))]
// TypedResults.Problem returns this; the AOT serializer throws NotSupportedException without it.
[JsonSerializable(typeof(ProblemDetails))]
// Auto-update: the GitHub releases listing.
[JsonSerializable(typeof(GitHubRelease[]))]
internal sealed partial class AppJsonContext : JsonSerializerContext;
