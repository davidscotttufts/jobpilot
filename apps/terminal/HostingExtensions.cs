using System.Globalization;
using JobPilot.Terminal.Contracts;
using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Pty;
using JobPilot.Terminal.Realtime;
using JobPilot.Terminal.Sessions;
using JobPilot.Terminal.Updates;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace JobPilot.Terminal;

/// <summary>
/// Service registration, middleware pipeline, and run wrapper for the terminal host.
/// </summary>
public static class HostingExtensions
{
    /// <summary>
    /// Registers every service the terminal host needs.
    /// </summary>
    /// <param name="services">Service collection to configure.</param>
    /// <param name="configuration">Host configuration, for the browser origin allowlist.</param>
    /// <returns>The same service collection for chaining.</returns>
    public static IServiceCollection AddTerminalHost(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddCors(options => options.AddPolicy(
            OriginPolicy.CorsPolicy,
            policy => policy
                .WithOrigins(OriginPolicy.Resolve(configuration))
                .AllowAnyHeader()
                .AllowAnyMethod()));
        services.AddSingleton<HostInstall>();
        services.AddSingleton<ProtocolRegistrar>();
        services.AddSingleton<HostUpdateService>();
        services.AddSingleton<IPty, PtyProcess>();
        services.AddSingleton<SessionManager>();
        services.AddSingleton<TerminalHub>();
        services.ConfigureHttpJsonOptions(c =>
            c.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));

        // Outside Development, minimal APIs answer a malformed body with a bare 400 and an empty response,
        // bypassing the exception handler below. Make binding failures throw so every error carries a
        // ProblemDetails.Detail, which is the only thing apps/web surfaces to the user.
        services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);

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

            // A malformed body surfaces as BadHttpRequestException(400) thanks to ThrowOnBadRequest above.
            // Reporting that as 500 would blame the host for the caller's bad JSON.
            var status = error is BadHttpRequestException bad
                ? bad.StatusCode
                : StatusCodes.Status500InternalServerError;

            context.Response.StatusCode = status;
            context.Response.ContentType = "application/problem+json";
            var problem = new ProblemDetails
            {
                Title = status == StatusCodes.Status500InternalServerError ? "Terminal host error" : "Invalid request",
                Detail = error?.Message,
                Status = status,
            };
            await context.Response.WriteAsJsonAsync(problem, AppJsonContext.Default.ProblemDetails);
        }));

        app.UseCors(OriginPolicy.CorsPolicy);

        // CORS does not cover WebSockets - the browser opens them regardless of the CORS policy. Kestrel's
        // own origin check does: a present-but-unlisted Origin is rejected, and an absent one is allowed.
        var webSockets = new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(30) };
        foreach (var origin in OriginPolicy.Resolve(app.Configuration))
        {
            webSockets.AllowedOrigins.Add(origin);
        }
        app.UseWebSockets(webSockets);

        app.Lifetime.ApplicationStopping.Register(() =>
            app.Services.GetRequiredService<SessionManager>().Stop());

        return app;
    }

    /// <summary>
    /// Runs the app, translating a bind conflict on the configured port into an actionable message and exit code 1.
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
                $"JobPilot terminal: port {ConfiguredPort(app.Configuration)} is already in use - another jobpilot instance is probably running.\n" +
                "Stop it and retry: 'Get-Process jobpilot | Stop-Process' (Windows) or 'pkill -x jobpilot' (macOS/Linux).");
            Environment.Exit(1);
        }
    }

    /// <summary>Port Kestrel was told to bind, so the diagnostic can never contradict appsettings.json.</summary>
    private static string ConfiguredPort(IConfiguration configuration)
    {
        var url = configuration["Kestrel:Endpoints:Http:Url"];
        return Uri.TryCreate(url, UriKind.Absolute, out var parsed)
            ? parsed.Port.ToString(CultureInfo.InvariantCulture)
            : "4102";
    }
}
