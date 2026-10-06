using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Pilot;
using JobPilot.Terminal.Sessions;
using JobPilot.Terminal.Updates;
using Microsoft.Extensions.Logging.Abstractions;

// Pty.Net's macOS forkpty path requires CoreCLR's W^X remapping to be off; harmless under NativeAOT.
if (OperatingSystem.IsMacOS())
{
    Environment.SetEnvironmentVariable("DOTNET_EnableWriteXorExecute", "0");
}

if (args.Contains("--version", StringComparer.OrdinalIgnoreCase))
{
    Console.WriteLine($"jobpilot {HostInstall.HostVersion}");
    return;
}

// Supervision, handled before the web host binds: installing is a one-shot command, not a mode.
if (args.Any(a => a.Equals("--install-service", StringComparison.OrdinalIgnoreCase)))
{
    // The exit code is the contract: setup falls back to a detached launch on anything non-zero,
    // which matching stdout prose could not do reliably.
    Environment.ExitCode = (int)ServiceInstaller.Install(Environment.ProcessPath ?? string.Empty, Console.Out);
    return;
}

if (args.Any(a => a.Equals("--uninstall-service", StringComparison.OrdinalIgnoreCase)))
{
    Environment.ExitCode = (int)ServiceInstaller.Uninstall(Console.Out);
    return;
}

if (args.Contains("--unregister", StringComparer.OrdinalIgnoreCase))
{
    UrlScheme.Unregister(NullLogger.Instance);
    Console.WriteLine("JobPilot: removed the jobpilot:// URL scheme.");
    return;
}

// appsettings.json sits beside the executable, whatever the launch directory.
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = UrlScheme.StripSchemeArgs(args),
    ContentRootPath = AppContext.BaseDirectory,
});
builder.Services.AddTerminalHost(builder.Configuration);
var app = builder.Build();

app.Services.GetRequiredService<UrlScheme>().Register();

// A successful startup update launches its replacement before this process binds.
if (await app.Services.GetRequiredService<HostUpdater>().UpdateAtStartupAsync())
{
    return;
}

await HostHandoff.WaitForPreviousHostAsync(app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Handoff"));

app.UseTerminalPipeline();
app.MapHostEndpoints();
app.MapSessionEndpoints();
app.MapPilotEndpoints();
app.MapUpdateEndpoints();
app.RunWithPortDiagnostics();
