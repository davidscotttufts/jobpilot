using System.Text.Json.Serialization;
using JobPilot.Terminal.Models;

namespace JobPilot.Terminal;

/// <summary>
/// Source-generated JSON metadata used by the Native AOT terminal host.
/// </summary>
[JsonSerializable(typeof(StartSessionRequest))]
[JsonSerializable(typeof(InjectRequest))]
[JsonSerializable(typeof(SessionStatus))]
internal sealed partial class AppJsonContext : JsonSerializerContext;
