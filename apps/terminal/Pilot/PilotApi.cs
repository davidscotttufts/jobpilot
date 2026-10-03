using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace JobPilot.Terminal.Pilot;

/// <summary>GET /api/pilot/activity.</summary>
public sealed record PilotActivity(bool Running, DateTimeOffset? LastActivityAt, CompletedCycle? LastCycle);

public sealed record CompletedCycle(string? CycleId, DateTimeOffset CompletedAt, string? Status, int? SleepSeconds);

/// <summary>The fields of POST /api/pilot/tasks/refresh the host reads.</summary>
public sealed record PilotTaskList(PilotTaskStub[] Tasks, string Version, int SleepSeconds, DateTimeOffset NextWakeAt);

public sealed record PilotTaskStub(string Id, string Title);

/// <summary>The fields of a run the host reads.</summary>
public sealed record PilotRunState(string Id, DateTimeOffset? FinishedAt, string? Outcome);

internal sealed record StartRunRequest(string TaskId, string TaskListVersion);

internal sealed record FinishRunRequest(string Outcome);

internal sealed record JournalRequest(
    JournalEntry[] Entries,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? CycleId = null);

internal sealed record JournalEntry(
    string Kind,
    string Summary,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] CycleDetail? Detail = null);

internal sealed record CycleDetail(string Status, int SleepSeconds);

/// <summary>Probes and reports throw only on the caller's cancellation, so a briefly unreachable API cannot take the loop down.</summary>
public sealed class PilotApi(HttpClient http, ILogger<PilotApi> logger)
{
    private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(10);

    // A refresh runs maintenance and may pull mail first.
    private static readonly TimeSpan RefreshTimeout = TimeSpan.FromSeconds(60);

    public async Task<PilotActivity?> GetActivityAsync(PilotSettings settings, CancellationToken ct)
    {
        try
        {
            using var timeout = TimeoutAfter(RequestTimeout, ct);
            using var request = Request(settings, HttpMethod.Get, "/api/pilot/activity");
            using var response = await http.SendAsync(request, timeout.Token);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Pilot activity probe was rejected ({Status}).", (int)response.StatusCode);
                return null;
            }

            return await response.Content.ReadFromJsonAsync(AppJsonContext.Default.PilotActivity, timeout.Token);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Pilot activity probe failed.");
            return null;
        }
    }

    /// <summary>Null when the refresh fails, including the 409 of a stopped pilot.</summary>
    public async Task<PilotTaskList?> RefreshTasksAsync(PilotSettings settings, CancellationToken ct)
    {
        try
        {
            using var timeout = TimeoutAfter(RefreshTimeout, ct);
            using var request = Request(settings, HttpMethod.Post, "/api/pilot/tasks/refresh");
            using var response = await http.SendAsync(request, timeout.Token);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Pilot task list refresh was rejected ({Status}).", (int)response.StatusCode);
                return null;
            }

            return await response.Content.ReadFromJsonAsync(AppJsonContext.Default.PilotTaskList, timeout.Token);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Pilot task list refresh failed.");
            return null;
        }
    }

    public Task ReportAsync(PilotSettings settings, string summary, CancellationToken ct) =>
        PostJournalAsync(settings, new JournalRequest([new JournalEntry("system", summary)]), ct);

    /// <summary>The cycle entry's detail is what the activity probe reads back as the cycle's completion.</summary>
    public Task JournalCycleAsync(
        PilotSettings settings, string? cycleId, string summary, string status, int sleepSeconds, CancellationToken ct)
    {
        var entry = new JournalEntry("cycle", summary, new CycleDetail(status, sleepSeconds));
        return PostJournalAsync(settings, new JournalRequest([entry], cycleId), ct);
    }

    public async Task<PilotRunState?> StartRunAsync(PilotSettings settings, string taskId, string taskListVersion, CancellationToken ct)
    {
        var content = JsonContent.Create(new StartRunRequest(taskId, taskListVersion), AppJsonContext.Default.StartRunRequest);
        return await SendForRunAsync(settings, HttpMethod.Post, "/api/pilot/runs", content, ct);
    }

    public Task<PilotRunState?> GetRunAsync(PilotSettings settings, string runId, CancellationToken ct) =>
        SendForRunAsync(settings, HttpMethod.Get, $"/api/pilot/runs/{runId}", null, ct);

    public async Task FailRunAsync(PilotSettings settings, string runId, CancellationToken ct)
    {
        var content = JsonContent.Create(new FinishRunRequest("failed"), AppJsonContext.Default.FinishRunRequest);
        await SendForRunAsync(settings, HttpMethod.Post, $"/api/pilot/runs/{runId}/finish", content, ct);
    }

    public async Task ReportUsageAsync(PilotSettings settings, string runId, PilotUsage usage, CancellationToken ct)
    {
        try
        {
            using var timeout = TimeoutAfter(RequestTimeout, ct);
            using var request = Request(settings, HttpMethod.Post, $"/api/pilot/runs/{runId}/usage");
            request.Content = JsonContent.Create(usage, AppJsonContext.Default.PilotUsage);
            using var response = await http.SendAsync(request, timeout.Token);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Pilot usage report was rejected ({Status}).", (int)response.StatusCode);
            }
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Pilot usage report could not be delivered.");
        }
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

    private async Task<PilotRunState?> SendForRunAsync(
        PilotSettings settings, HttpMethod method, string path, HttpContent? content, CancellationToken ct)
    {
        try
        {
            using var timeout = TimeoutAfter(RequestTimeout, ct);
            using var request = Request(settings, method, path);
            request.Content = content;
            using var response = await http.SendAsync(request, timeout.Token);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Pilot run call {Method} {Path} was rejected ({Status}).", method, path, (int)response.StatusCode);
                return null;
            }

            return await response.Content.ReadFromJsonAsync(AppJsonContext.Default.PilotRunState, timeout.Token);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Pilot run call {Method} {Path} failed.", method, path);
            return null;
        }
    }

    private async Task PostJournalAsync(PilotSettings settings, JournalRequest body, CancellationToken ct)
    {
        try
        {
            using var timeout = TimeoutAfter(RequestTimeout, ct);
            using var request = Request(settings, HttpMethod.Post, "/api/pilot/journal");
            request.Content = JsonContent.Create(body, AppJsonContext.Default.JournalRequest);
            using var response = await http.SendAsync(request, timeout.Token);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Pilot journal write was rejected ({Status}).", (int)response.StatusCode);
            }
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Pilot journal write could not be delivered.");
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
