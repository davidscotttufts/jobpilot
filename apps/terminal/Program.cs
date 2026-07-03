using JobPilot.Terminal.Models;
using JobPilot.Terminal.Plugins;
using JobPilot.Terminal.Pty;
using JobPilot.Terminal.Realtime;
using JobPilot.Terminal.Sessions;
using Microsoft.AspNetCore.Http.HttpResults;

// Content root = exe dir, not launch CWD, so appsettings.json (pins :4102) loads regardless of where we start.
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
});

builder.Services.AddCors();
builder.Services.AddTerminal();
builder.Services.AddSingleton<SessionManager>();
builder.Services.AddSingleton<TerminalHub>();
builder.Services.ConfigureHttpJsonOptions(c =>
    c.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));

var app = builder.Build();

// Auto-update host + plugin before binding. If the host self-updated it relaunched into the new build,
// so exit and let that process bind the port.
if (await StartupUpdater.RunAsync(app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Updater")))
{
    return;
}

app.UseCors(c => c.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(30) });

app.Lifetime.ApplicationStopping.Register(() =>
{
    var session = app.Services.GetRequiredService<SessionManager>();
    session.Stop();
});

app.MapGet("/healthz", (SessionManager session) =>
{
    var sessionState = session.State == SessionState.Running ? "running" : "stopped";
    return TypedResults.Ok(new SessionStatus("ok", sessionState, session.ActiveProvider, SessionManager.Providers, SessionManager.HostVersion));
});

app.MapPost("/sessions/start", Results<Ok<SessionStatus>, ProblemHttpResult> (StartSessionRequest request, SessionManager session) =>
{
    try
    {
        session.Start(request.Provider, request.WorkingDir, request.Cols, request.Rows, request.ApiToken, request.WebUrl);
    }
    catch (PtyStartException ex)
    {
        return TypedResults.Problem(
          title: "Failed to start terminal session",
          detail: ex.Message,
          statusCode: StatusCodes.Status500InternalServerError);
    }
    return TypedResults.Ok(new SessionStatus("ok", "running", session.ActiveProvider, SessionManager.Providers, SessionManager.HostVersion));
});

app.MapPost("/sessions/inject", async Task<Results<Ok, ProblemHttpResult>> (InjectRequest request, SessionManager session) =>
{
    var injected = await session.Inject(request.Command, request.Provider);

    if (!injected)
    {
        return TypedResults.Problem(
          title: "Inject rejected",
          detail: "The session is not running or the active provider does not match the requested provider.",
          statusCode: StatusCodes.Status409Conflict);
    }
    return TypedResults.Ok();
});

app.MapDelete("/sessions/current", (SessionManager session) =>
{
    session.Stop();
    return TypedResults.Ok(new SessionStatus("ok", "stopped", session.ActiveProvider, SessionManager.Providers, SessionManager.HostVersion));
});

app.Map("/ws", async (HttpContext ctx, TerminalHub hub) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var socket = await ctx.WebSockets.AcceptWebSocketAsync();
    await hub.HandleAsync(socket, ctx.RequestAborted);
});

app.Run();
