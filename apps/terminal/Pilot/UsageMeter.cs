using System.Globalization;
using System.Text.Json;

namespace JobPilot.Terminal.Pilot;

/// <summary>POST /api/pilot/runs/:id/usage: one run's token usage.</summary>
public sealed record PilotUsage(
    string Model, long InputTokens, long OutputTokens, long CacheReadTokens, long CacheWriteTokens);

/// <summary>Sums the per-request usage both provider CLIs export to the host's OTLP/HTTP JSON logs endpoint.</summary>
public sealed class UsageMeter
{
    private readonly Lock sync = new();
    private string? model;
    private long input;
    private long output;
    private long cacheRead;
    private long cacheWrite;

    /// <summary>Drops what came before, such as the user's own session between cycles.</summary>
    public void Start()
    {
        lock (sync)
        {
            Reset();
        }
    }

    /// <summary>Null when no request was measured since <see cref="Start"/>.</summary>
    public PilotUsage? Take()
    {
        lock (sync)
        {
            if (model is null)
            {
                return null;
            }

            var usage = new PilotUsage(model, input, output, cacheRead, cacheWrite);
            Reset();
            return usage;
        }
    }

    public void Read(JsonElement export)
    {
        foreach (var record in LogRecords(export))
        {
            var attributes = Attributes(record);
            var name = Text(attributes, "event.name");
            if (name == "api_request")
            {
                Add(
                    Text(attributes, "model"),
                    Number(attributes, "input_tokens"),
                    Number(attributes, "output_tokens"),
                    Number(attributes, "cache_read_tokens"),
                    Number(attributes, "cache_creation_tokens"));
            }
            else if (name == "codex.sse_event" && Text(attributes, "event.kind") == "response.completed")
            {
                // Codex counts cached tokens inside its input count; Claude reports them apart.
                var cached = Number(attributes, "cached_token_count");
                Add(
                    Text(attributes, "model"),
                    Number(attributes, "input_token_count") - cached,
                    Number(attributes, "output_token_count"),
                    cached,
                    Number(attributes, "cache_write_token_count"));
            }
        }
    }

    private void Reset()
    {
        model = null;
        input = output = cacheRead = cacheWrite = 0;
    }

    private void Add(string? requestModel, long requestInput, long requestOutput, long requestCacheRead, long requestCacheWrite)
    {
        lock (sync)
        {
            model = requestModel ?? model ?? "unknown";
            input += requestInput;
            output += requestOutput;
            cacheRead += requestCacheRead;
            cacheWrite += requestCacheWrite;
        }
    }

    private static IEnumerable<JsonElement> LogRecords(JsonElement export) =>
        from resource in Array(export, "resourceLogs")
        from scope in Array(resource, "scopeLogs")
        from record in Array(scope, "logRecords")
        select record;

    private static IEnumerable<JsonElement> Array(JsonElement parent, string name) =>
        parent.ValueKind == JsonValueKind.Object && parent.TryGetProperty(name, out var array) && array.ValueKind == JsonValueKind.Array
            ? array.EnumerateArray()
            : [];

    private static Dictionary<string, JsonElement> Attributes(JsonElement record)
    {
        Dictionary<string, JsonElement> attributes = [];
        foreach (var attribute in Array(record, "attributes"))
        {
            if (attribute.TryGetProperty("key", out var key) && attribute.TryGetProperty("value", out var value))
            {
                attributes[key.GetString() ?? ""] = value;
            }
        }

        return attributes;
    }

    private static string? Text(Dictionary<string, JsonElement> attributes, string key) =>
        attributes.TryGetValue(key, out var value) && value.TryGetProperty("stringValue", out var text) ? text.GetString() : null;

    // OTLP JSON allows an int as a number or a string, and Codex sends some counts as stringValue.
    private static long Number(Dictionary<string, JsonElement> attributes, string key)
    {
        if (!attributes.TryGetValue(key, out var value))
        {
            return 0;
        }

        foreach (var property in value.EnumerateObject())
        {
            var raw = property.Value;
            var text = raw.ValueKind == JsonValueKind.String ? raw.GetString() : raw.GetRawText();
            if (long.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number))
            {
                return number;
            }
        }

        return 0;
    }
}
