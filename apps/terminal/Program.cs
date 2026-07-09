using JobPilot.Terminal;
using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Updates;
using Microsoft.Extensions.Logging.Abstractions;

// Pty.Net's macOS forkpty path requires CoreCLR's W^X remapping to be off; harmless under NativeAOT.
if (OperatingSystem.IsMacOS())
{
    Environment.SetEnvironmentVariable("DOTNET_EnableWriteXorExecute", "0");
}

if (args.Any(a => a.Equals("--unregister", StringComparison.OrdinalIgnoreCase)))
{
    ProtocolRegistrar.Unregister(NullLogger.Instance);
    Console.WriteLine("JobPilot: removed the jobpilot:// URL scheme.");
    return;
}

var hostArgs = ProtocolRegistrar.ResolveHostArgs(args);

// Load appsettings.json beside the executable, regardless of the launch directory.
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = hostArgs,
    ContentRootPath = AppContext.BaseDirectory,
});

builder.Services.AddTerminalHost(builder.Configuration);

var app = builder.Build();

app.Services.GetRequiredService<ProtocolRegistrar>().EnsureRegistered();

// A successful startup update launches its replacement before this process binds.
var updates = app.Services.GetRequiredService<HostUpdateService>();
if (!HostHandoff.IsUpdateRelaunch && await updates.UpdateAtStartupAsync())
{
    return;
}

await HostHandoff.WaitForParentExitAsync(app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Handoff"));

app.UseTerminalPipeline();
app.MapTerminalEndpoints();
app.RunWithPortDiagnostics();
