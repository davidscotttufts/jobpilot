using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

namespace JobPilot.Terminal.Pilot;

/// <summary>GET /api/pilot/activity.</summary>
public sealed record PilotActivity(bool Running, DateTimeOffset? LastActivityAt, CompletedCycle? LastCycle);

public sealed record CompletedCycle(DateTimeOffset CompletedAt, int? SleepSeconds);

/// <summary>The fields of POST /api/pilot/tasks/refresh the host reads.</summary>
public sealed record PilotTaskList(PilotTaskStub[] Tasks, string Version, int SleepSeconds);

public sealed record PilotTaskStub(string Id, string TaskType, string Title);

/// <summary>The fields of a run the host reads.</summary>
public sealed record PilotRunState(string Id, DateTimeOffset? FinishedAt, string? Outcome);

internal sealed record StartRunRequest(string TaskId, string TaskListVersion);

internal sealed record FinishRunRequest(string Outcome);

internal sealed record IdleCycleRequest(int SleepSeconds);

internal sealed record JournalRequest(
    JournalEntry[] Entries,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? CycleId = null);

internal sealed record JournalEntry(
    string Kind,
    string Summary,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] CycleDetail? Detail = null);

/// <summary>A working cycle's journal entry detail; the API reads the run's task type and tokens from the run itself.</summary>
public sealed record CycleDetail(string Status, int SleepSeconds);

/// <summary>Probes and reports throw only on the caller's cancellation, so a briefly unreachable API cannot take the loop down.</summary>
public sealed class PilotApi(HttpClient http, ILogger<PilotApi> logger)
{
    private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(10);

    // A refresh runs maintenance and may pull mail first.
    private static readonly TimeSpan RefreshTimeout = TimeSpan.FromSeconds(60);

    public Task<PilotActivity?> GetActivityAsync(PilotSettings settings, CancellationToken ct) =>
        SendAsync(settings, HttpMethod.Get, "/api/pilot/activity", null, AppJsonContext.Default.PilotActivity, RequestTimeout, ct);

    /// <summary>Null when the refresh fails, including the 409 of a stopped pilot.</summary>
    public Task<PilotTaskList?> RefreshTasksAsync(PilotSettings settings, CancellationToken ct) =>
        SendAsync(settings, HttpMethod.Post, "/api/pilot/tasks/refresh", null, AppJsonContext.Default.PilotTaskList, RefreshTimeout, ct);

    public Task ReportAsync(PilotSettings settings, string summary, CancellationToken ct) =>
        PostJournalAsync(settings, new JournalRequest([new JournalEntry("system", summary)]), ct);

    /// <summary>The cycle entry's detail is what the activity probe reads back as the cycle's completion.</summary>
    public Task JournalCycleAsync(PilotSettings settings, string cycleId, string summary, CycleDetail detail, CancellationToken ct) =>
        PostJournalAsync(settings, new JournalRequest([new JournalEntry("cycle", summary, detail)], cycleId), ct);

    /// <summary>An idle check writes no journal entry; the API records it on the pilot state, which the activity probe reads back.</summary>
    public Task RecordIdleCycleAsync(PilotSettings settings, int sleepSeconds, CancellationToken ct)
    {
        var content = JsonContent.Create(new IdleCycleRequest(sleepSeconds), AppJsonContext.Default.IdleCycleRequest);
        return SendAsync<object>(settings, HttpMethod.Post, "/api/pilot/cycles/idle", content, null, RequestTimeout, ct);
    }

    public Task<PilotRunState?> StartRunAsync(PilotSettings settings, string taskId, string taskListVersion, CancellationToken ct)
    {
        var content = JsonContent.Create(new StartRunRequest(taskId, taskListVersion), AppJsonContext.Default.StartRunRequest);
        return SendForRunAsync(settings, HttpMethod.Post, "/api/pilot/runs", content, ct);
    }

    public Task<PilotRunState?> GetRunAsync(PilotSettings settings, string runId, CancellationToken ct) =>
        SendForRunAsync(settings, HttpMethod.Get, $"/api/pilot/runs/{runId}", null, ct);

    public Task FailRunAsync(PilotSettings settings, string runId, CancellationToken ct)
    {
        var content = JsonContent.Create(new FinishRunRequest("failed"), AppJsonContext.Default.FinishRunRequest);
        return SendForRunAsync(settings, HttpMethod.Post, $"/api/pilot/runs/{runId}/finish", content, ct);
    }

    public Task ReportUsageAsync(PilotSettings settings, string runId, PilotUsage usage, CancellationToken ct)
    {
        var content = JsonContent.Create(usage, AppJsonContext.Default.PilotUsage);
        return SendAsync<object>(settings, HttpMethod.Post, $"/api/pilot/runs/{runId}/usage", content, null, RequestTimeout, ct);
    }

    /// <summary>Null when the server rejects the stream. Unlike the calls above, transport failures throw.</summary>
    public async Task<HttpResponseMessage?> OpenEventsAsync(PilotSettings settings, CancellationToken ct)
    {
        var request = Request(settings, HttpMethod.Get, "/api/pilot/events");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
        var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (response.IsSuccessStatusCode)
        {
            return response;
        }

        logger.LogWarning("Pilot event stream was rejected ({Status}).", (int)response.StatusCode);
        response.Dispose();
        return null;
    }

    private Task<PilotRunState?> SendForRunAsync(
        PilotSettings settings, HttpMethod method, string path, HttpContent? content, CancellationToken ct) =>
        SendAsync(settings, method, path, content, AppJsonContext.Default.PilotRunState, RequestTimeout, ct);

    private Task PostJournalAsync(PilotSettings settings, JournalRequest body, CancellationToken ct)
    {
        var content = JsonContent.Create(body, AppJsonContext.Default.JournalRequest);
        return SendAsync<object>(settings, HttpMethod.Post, "/api/pilot/journal", content, null, RequestTimeout, ct);
    }

    /// <summary>Reads the body only when <paramref name="read"/> is given; null on any rejection or failure.</summary>
    private async Task<T?> SendAsync<T>(
        PilotSettings settings,
        HttpMethod method,
        string path,
        HttpContent? content,
        JsonTypeInfo<T>? read,
        TimeSpan timeoutAfter,
        CancellationToken ct)
        where T : class
    {
        try
        {
            using var timeout = TimeoutAfter(timeoutAfter, ct);
            using var request = Request(settings, method, path);
            request.Content = content;
            using var response = await http.SendAsync(request, timeout.Token);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Pilot call {Method} {Path} was rejected ({Status}).", method, path, (int)response.StatusCode);
                return null;
            }

            return read is null ? null : await response.Content.ReadFromJsonAsync(read, timeout.Token);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Pilot call {Method} {Path} failed.", method, path);
            return null;
        }
    }

    private static HttpRequestMessage Request(PilotSettings settings, HttpMethod method, string path)
    {
        var request = new HttpRequestMessage(method, settings.ApiUrl.TrimEnd('/') + path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ApiToken);
        return request;
    }

    private static CancellationTokenSource TimeoutAfter(TimeSpan duration, CancellationToken ct)
    {
        var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(duration);
        return timeout;
    }
}
