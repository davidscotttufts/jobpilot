using System.Net;
using JobPilot.Terminal.Pilot;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using static JobPilot.Terminal.Tests.Builders;

namespace JobPilot.Terminal.Tests;

public sealed class PilotApiTests
{
    private const string ActivityJson =
        """{"running":true,"lastActivityAt":"2026-07-19T18:34:43Z","lastCycle":{"completedAt":"2026-07-19T18:30:00Z","sleepSeconds":300},"activeRuns":2}""";

    private static PilotApi Api(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> respond) =>
        new(new HttpClient(new StubHandler(respond)), NullLogger<PilotApi>.Instance);

    private static Task<HttpResponseMessage> Respond(HttpStatusCode status, string? body = null) =>
        Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(body ?? "") });

    [Fact]
    public async Task GetActivity_ParsesTheResponse_WithABearerHeader()
    {
        HttpRequestMessage? seen = null;
        var api = Api((request, _) =>
        {
            seen = request;
            return Respond(HttpStatusCode.OK, ActivityJson);
        });

        var activity = await api.GetActivityAsync(Settings(apiUrl: "https://api.example.test/"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpMethod.Get, seen!.Method);
        Assert.Equal("https://api.example.test/api/pilot/activity", seen.RequestUri!.ToString());
        Assert.Equal("Bearer tok", seen.Headers.Authorization!.ToString());
        Assert.Equal(
            new PilotActivity(
                true,
                new DateTimeOffset(2026, 7, 19, 18, 34, 43, TimeSpan.Zero),
                new CompletedCycle(new DateTimeOffset(2026, 7, 19, 18, 30, 0, TimeSpan.Zero), 300)),
            activity);
    }

    [Fact]
    public async Task GetActivity_ReturnsNull_OnARejectionATransportFailureATimeoutOrABadBody()
    {
        var ct = TestContext.Current.CancellationToken;

        Assert.Null(await Api((_, _) => Respond(HttpStatusCode.Unauthorized)).GetActivityAsync(Settings(), ct));
        Assert.Null(await Api((_, _) => throw new HttpRequestException("refused")).GetActivityAsync(Settings(), ct));
        Assert.Null(await Api((_, token) => throw new TaskCanceledException("timed out", null, token)).GetActivityAsync(Settings(), ct));
        Assert.Null(await Api((_, _) => Respond(HttpStatusCode.OK, "{ not json")).GetActivityAsync(Settings(), ct));
    }

    [Fact]
    public async Task RefreshTasks_PostsTheRefresh_AndReadsTheTaskList()
    {
        const string body = """{"tasks":[{"id":"t1","title":"Apply to Acme","taskType":"job.apply"}],"emptyReason":null,"sleepSeconds":15,"nextWakeAt":"2026-10-02T12:00:15Z","version":"v1"}""";
        HttpRequestMessage? seen = null;
        var api = Api((request, _) =>
        {
            seen = request;
            return Respond(HttpStatusCode.OK, body);
        });

        var taskList = await api.RefreshTasksAsync(Settings(apiUrl: "https://api.example.test/"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpMethod.Post, seen!.Method);
        Assert.Equal("https://api.example.test/api/pilot/tasks/refresh", seen.RequestUri!.ToString());
        Assert.Equal("Bearer tok", seen.Headers.Authorization!.ToString());
        Assert.Equal([new PilotTaskStub("t1", "job.apply", "Apply to Acme")], taskList!.Tasks);
        Assert.Equal("v1", taskList.Version);
        Assert.Equal(15, taskList.SleepSeconds);
    }

    [Fact]
    public async Task RefreshTasks_ReturnsNull_OnAStoppedPilotARejectionOrATransportFailure()
    {
        var ct = TestContext.Current.CancellationToken;

        Assert.Null(await Api((_, _) => Respond(HttpStatusCode.Conflict)).RefreshTasksAsync(Settings(), ct));
        Assert.Null(await Api((_, _) => Respond(HttpStatusCode.TooManyRequests)).RefreshTasksAsync(Settings(), ct));
        Assert.Null(await Api((_, _) => throw new HttpRequestException("refused")).RefreshTasksAsync(Settings(), ct));
    }

    [Fact]
    public async Task JournalCycle_PostsACycleEntryWithItsDetail()
    {
        string? body = null;
        var api = Api(async (request, ct) =>
        {
            body = await request.Content!.ReadAsStringAsync(ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        await api.JournalCycleAsync(
            Settings(), "run-1", "Task 1 - done.", new CycleDetail("ok", 30), TestContext.Current.CancellationToken);

        Assert.Equal(
            """{"entries":[{"kind":"cycle","summary":"Task 1 - done.","detail":{"status":"ok","sleepSeconds":30}}],"cycleId":"run-1"}""",
            body);
    }

    [Fact]
    public async Task ReportUsage_PostsTheCyclesUsage()
    {
        HttpRequestMessage? seen = null;
        string? body = null;
        var api = Api(async (request, ct) =>
        {
            seen = request;
            body = await request.Content!.ReadAsStringAsync(ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var usage = new PilotUsage("claude-sonnet-5", 4, 320, 130000, 600);

        await api.ReportUsageAsync(Settings(apiUrl: "https://api.example.test/"), "run-1", usage, TestContext.Current.CancellationToken);

        Assert.Equal("https://api.example.test/api/pilot/runs/run-1/usage", seen!.RequestUri!.ToString());
        Assert.Equal(
            """{"model":"claude-sonnet-5","inputTokens":4,"outputTokens":320,"cacheReadTokens":130000,"cacheWriteTokens":600}""",
            body);
    }

    [Fact]
    public async Task Runs_StartReadAndFail_OnTheirRoutes()
    {
        List<string> seen = [];
        var api = Api(async (request, ct) =>
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(ct);
            seen.Add($"{request.Method} {request.RequestUri!.AbsolutePath} {body}");
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"id":"run-1","finishedAt":null,"outcome":null,"taskType":"job.apply"}"""),
            };
        });
        var ct = TestContext.Current.CancellationToken;

        Assert.Equal(new PilotRunState("run-1", null, null), await api.StartRunAsync(Settings(), "t1", "v1", ct));
        Assert.NotNull(await api.GetRunAsync(Settings(), "run-1", ct));
        await api.FailRunAsync(Settings(), "run-1", ct);

        Assert.Equal(
            [
                """POST /api/pilot/runs {"taskId":"t1","taskListVersion":"v1"}""",
                "GET /api/pilot/runs/run-1 ",
                """POST /api/pilot/runs/run-1/finish {"outcome":"failed"}""",
            ],
            seen);
    }

    [Fact]
    public async Task RecordIdleCycle_PostsTheSleep()
    {
        string? seen = null;
        var api = Api(async (request, ct) =>
        {
            seen = $"{request.Method} {request.RequestUri!.AbsolutePath} {await request.Content!.ReadAsStringAsync(ct)}";
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        await api.RecordIdleCycleAsync(Settings(), 1800, TestContext.Current.CancellationToken);

        Assert.Equal("""POST /api/pilot/cycles/idle {"sleepSeconds":1800}""", seen);
    }

    [Fact]
    public async Task StartRun_ReturnsNull_WhenTheServerRefusesIt()
    {
        var api = Api((_, _) => Respond(HttpStatusCode.Conflict));

        Assert.Null(await api.StartRunAsync(Settings(), "t1", "v1", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Report_PostsTheJournalEntry()
    {
        HttpRequestMessage? seen = null;
        string? body = null;
        var api = Api(async (request, ct) =>
        {
            seen = request;
            body = await request.Content!.ReadAsStringAsync(ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        await api.ReportAsync(Settings(apiUrl: "https://api.example.test/"), "hello world", TestContext.Current.CancellationToken);

        Assert.Equal(HttpMethod.Post, seen!.Method);
        Assert.Equal("https://api.example.test/api/pilot/journal", seen.RequestUri!.ToString());
        Assert.Equal("Bearer tok", seen.Headers.Authorization!.ToString());
        Assert.Equal("""{"entries":[{"kind":"system","summary":"hello world"}]}""", body);
    }

    [Fact]
    public async Task Report_NeverThrows_OnARejectionOrATransportFailure()
    {
        var ct = TestContext.Current.CancellationToken;

        await Api((_, _) => Respond(HttpStatusCode.InternalServerError)).ReportAsync(Settings(), "boom", ct);
        await Api((_, _) => throw new HttpRequestException("refused")).ReportAsync(Settings(), "unreachable", ct);
    }

    [Fact]
    public async Task Calls_PropagateTheCallersCancellation()
    {
        var api = Api(async (_, ct) =>
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => api.GetActivityAsync(Settings(), cts.Token));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => api.ReportAsync(Settings(), "stop", cts.Token));
    }

    private sealed class StubHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> respond)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            respond(request, ct);
    }
}
