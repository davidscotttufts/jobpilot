using JobPilot.Terminal.Models;
using JobPilot.Terminal.Pty;
using JobPilot.Terminal.Realtime;
using JobPilot.Terminal.Sessions;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Terminal.Hosting;

/// <summary>
/// Service registration, middleware pipeline, and run wrapper for the terminal host.
/// </summary>
public static class HostingExtensions
{
    /// <summary>
    /// Registers every service the terminal host needs.
    /// </summary>
    /// <param name="services">Service collection to configure.</param>
    /// <returns>The same service collection for chaining.</returns>
    public static IServiceCollection AddTerminalHost(this IServiceCollection services)
    {
        services.AddCors();
        services.AddSingleton<PtyService>();
        services.AddSingleton<SessionManager>();
        services.AddSingleton<TerminalHub>();
        services.ConfigureHttpJsonOptions(c =>
            c.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));
        return services;
    }

    /// <summary>
    /// Configures error handling, CORS, WebSockets, and session teardown on shutdown.
    /// </summary>
    /// <param name="app">The web application to configure.</param>
    /// <returns>The same application for chaining.</returns>
    public static WebApplication UseTerminalPipeline(this WebApplication app)
    {
        // Nothing may escape as a bare 500 with an empty body - the web reads ProblemDetails.Detail.
        app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
        {
            var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/problem+json";
            var problem = new ProblemDetails
            {
                Title = "Terminal host error",
                Detail = error?.Message,
                Status = StatusCodes.Status500InternalServerError,
            };
            await context.Response.WriteAsJsonAsync(problem, AppJsonContext.Default.ProblemDetails);
        }));

        app.UseCors(c => c.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
        app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(30) });

        app.Lifetime.ApplicationStopping.Register(() =>
            app.Services.GetRequiredService<SessionManager>().Stop());

        return app;
    }

    /// <summary>
    /// Runs the app, translating a port-4102 bind conflict into an actionable message and exit code 1.
    /// </summary>
    /// <param name="app">The configured web application.</param>
    public static void RunWithPortDiagnostics(this WebApplication app)
    {
        try
        {
            app.Run();
        }
        catch (IOException ex) when (ex.InnerException is AddressInUseException)
        {
            Console.Error.WriteLine(
                "JobPilot terminal: port 4102 is already in use - another jobpilot instance is probably running.\n" +
                "Stop it and retry: 'Get-Process jobpilot | Stop-Process' (Windows) or 'pkill -x jobpilot' (macOS/Linux).");
            Environment.Exit(1);
        }
    }
}
