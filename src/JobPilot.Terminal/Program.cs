using System.Net.WebSockets;
using JobPilot.Terminal;
using JobPilot.Terminal.Models;
using JobPilot.Terminal.Pty;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("TERMINAL_PORT") ?? "8001";
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");

builder.Services.AddTerminal();
builder.Services.AddSingleton<SessionManager>();
builder.Services.AddSingleton<TerminalHub>();

const string CorsPolicy = "WebOrigin";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy => policy
        .WithOrigins("http://127.0.0.1:8000", "http://localhost:8000")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors(CorsPolicy);
app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(30) });

app.Lifetime.ApplicationStopping.Register(() =>
{
    var session = app.Services.GetRequiredService<SessionManager>();
    session.Stop();
});

app.MapGet("/healthz", (SessionManager session) =>
{
    var sessionState = session.State == SessionState.Running ? "running" : "stopped";
    return Results.Ok(new SessionStatus("ok", sessionState));
});

app.MapPost("/sessions/start", (StartSessionRequest request, SessionManager session) =>
{
    session.Start(request.WorkingDir, request.Cols, request.Rows);
    return Results.Ok(new SessionStatus("ok", "running"));
});

app.MapPost("/sessions/inject", (InjectRequest request, SessionManager session) =>
{
    session.Inject(request.Command);
    return Results.Ok();
});

app.MapDelete("/sessions/current", (SessionManager session) =>
{
    session.Stop();
    return Results.Ok(new SessionStatus("ok", "stopped"));
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
