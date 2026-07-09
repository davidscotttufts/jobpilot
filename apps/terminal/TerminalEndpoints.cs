using JobPilot.Terminal.Contracts;
using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Realtime;
using JobPilot.Terminal.Sessions;
using JobPilot.Terminal.Updates;
using Microsoft.AspNetCore.Http.HttpResults;

namespace JobPilot.Terminal;

/// <summary>
/// HTTP and WebSocket endpoints exposed by the terminal host.
/// </summary>
public static class TerminalEndpoints
{
    /// <summary>Upper bound on an injected command line - generous for a skill invocation, bounded for a PTY write.</summary>
    private const int MaxCommandLength = 32 * 1024;

    /// <summary>
    /// Maps /healthz, the /sessions lifecycle endpoints, and the /ws terminal socket.
    /// </summary>
    /// <param name="app">The web application to map endpoints on.</param>
    /// <returns>The same application for chaining.</returns>
    public static WebApplication MapTerminalEndpoints(this WebApplication app)
    {
        app.MapGet("/healthz", (SessionManager session, HostInstall install, ProtocolRegistrar registrar) => TypedResults.Ok(CurrentStatus(session, install, registrar)));

        app.MapPost("/sessions/start", Results<Ok<SessionStatus>, ProblemHttpResult> (StartSessionRequest request, SessionManager session, HostInstall install, ProtocolRegistrar registrar) =>
        {
            if (!Viewport.IsValid(request.Cols, request.Rows))
            {
                return BadRequest($"cols and rows must each be between {Viewport.MinSize} and {Viewport.MaxSize}.");
            }

            try
            {
                session.Start(request.Provider, request.Cols, request.Rows, request.ApiToken, request.WebUrl, request.ApiUrl);
            }
            catch (ArgumentException ex)
            {
                // An unknown provider id is the caller's mistake, not a host failure.
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return TypedResults.Problem(
                    title: "Failed to start terminal session",
                    detail: ex.Message,
                    statusCode: StatusCodes.Status500InternalServerError);
            }
            return TypedResults.Ok(CurrentStatus(session, install, registrar));
        });

        app.MapPost("/sessions/inject", async Task<Results<Ok, ProblemHttpResult>> (InjectRequest request, SessionManager session) =>
        {
            if (string.IsNullOrWhiteSpace(request.Command))
            {
                return BadRequest("command must be a non-empty string.");
            }

            if (request.Command.Length > MaxCommandLength)
            {
                return BadRequest($"command must be at most {MaxCommandLength} characters.");
            }

            InjectResult result;
            try
            {
                result = await session.Inject(request.Command, request.Provider);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }

            // The web maps 409 to a single "session isn't ready" message; the distinction lives in the logs.
            return result switch
            {
                InjectResult.Injected => TypedResults.Ok(),
                InjectResult.ProviderMismatch => Conflict("The active provider does not match the requested provider."),
                _ => Conflict("The terminal session is not running."),
            };
        });

        app.MapDelete("/sessions/current", (SessionManager session, HostInstall install, ProtocolRegistrar registrar) =>
        {
            session.Stop();
            return TypedResults.Ok(CurrentStatus(session, install, registrar));
        });

        app.MapPost("/update", async Task<Results<Ok<UpdateResult>, ProblemHttpResult>> (
            HostUpdateService updates, IHostApplicationLifetime lifetime, CancellationToken ct) =>
        {
            try
            {
                var result = await updates.UpdateNowAsync(ct);
                if (result.Updating)
                {
                    // Respond first, then release the port so the waiting child can bind.
                    HostHandoff.BeginRelease(lifetime);
                }
                return TypedResults.Ok(result);
            }
            catch (Exception ex)
            {
                return TypedResults.Problem(
                    title: "Failed to update the terminal host",
                    detail: ex.Message,
                    statusCode: StatusCodes.Status500InternalServerError);
            }
        });

        app.MapGet("/ws", async (HttpContext ctx, TerminalHub hub) =>
        {
            if (!ctx.WebSockets.IsWebSocketRequest)
            {
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            using var socket = await ctx.WebSockets.AcceptWebSocketAsync();
            await hub.HandleAsync(socket, ctx.RequestAborted);
        });

        return app;
    }

    private static ProblemHttpResult BadRequest(string detail) => TypedResults.Problem(
        title: "Invalid request", detail: detail, statusCode: StatusCodes.Status400BadRequest);

    private static ProblemHttpResult Conflict(string detail) => TypedResults.Problem(
        title: "Inject rejected", detail: detail, statusCode: StatusCodes.Status409Conflict);

    /// <summary>
    /// Snapshot of host health + session state ("degraded" = the host runs but sessions
    /// can't start, e.g. the plugin tree is missing).
    /// </summary>
    private static SessionStatus CurrentStatus(SessionManager session, HostInstall install, ProtocolRegistrar registrar) => new()
    {
        Status = install.PathsError is null ? SessionStatus.StatusOk : SessionStatus.StatusDegraded,
        Session = session.State == SessionState.Running ? SessionStatus.SessionRunning : SessionStatus.SessionStopped,
        Provider = session.ActiveProvider,
        Providers = TerminalProviders.Supported(),
        HostVersion = HostInstall.HostVersion,
        Detail = install.PathsError,
        CanRelaunch = registrar.IsRegistered,
        CanUpdate = install.CanUpdate,
    };
}
