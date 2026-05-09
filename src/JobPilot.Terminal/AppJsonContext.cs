using System.Text.Json.Serialization;
using JobPilot.Terminal.Models;

namespace JobPilot.Terminal;

[JsonSerializable(typeof(StartSessionRequest))]
[JsonSerializable(typeof(InjectRequest))]
[JsonSerializable(typeof(SessionStatus))]
internal sealed partial class AppJsonContext : JsonSerializerContext;
