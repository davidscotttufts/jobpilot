using JobPilot.Terminal;
using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Updates;
using Microsoft.Extensions.Logging.Abstractions;

// Pty.Net's macOS forkpty path requires CoreCLR's W^X remapping to be off; harmless under NativeAOT.
if (OperatingSystem.IsMacOS())
{
    Environment.SetEnvironmentVariable("DOTNET_EnableWriteXorExecute", "0");
}

// `jobpilot --unregister` clears the jobpilot:// scheme (for uninstall) and exits without starting the host.
if (args.Any(a => a.Equals("--unregister", StringComparison.OrdinalIgnoreCase)))
{
    ProtocolRegistrar.Unregister(NullLogger.Instance);
    Console.WriteLine("JobPilot: removed the jobpilot:// URL scheme.");
    return;
}

// If the browser launched us via the jobpilot:// scheme, drop the flashed console and strip the scheme arg.
var hostArgs = ProtocolRegistrar.ResolveHostArgs(args);

// Content root = exe dir, not launch CWD, so appsettings.json (pins :4102) loads regardless of where we start.
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = hostArgs,
    ContentRootPath = AppContext.BaseDirectory,
});

builder.Services.AddTerminalHost(builder.Configuration);

var app = builder.Build();

// Register the jobpilot:// scheme so the dashboard can relaunch us from the browser when offline.
app.Services.GetRequiredService<ProtocolRegistrar>().EnsureRegistered();

// Auto-update the host before binding, unless a runtime self-update already relaunched us into the latest build.
// A self-update relaunches into the new build, so exit and let that process bind the port.
var updates = app.Services.GetRequiredService<HostUpdateService>();
if (!HostHandoff.IsUpdateRelaunch && await updates.UpdateAtStartupAsync())
{
    return;
}

// If a prior host relaunched us for a runtime self-update, wait for it to release :4102 before binding.
await HostHandoff.WaitForParentExitAsync(app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Handoff"));

app.UseTerminalPipeline();
app.MapTerminalEndpoints();
app.RunWithPortDiagnostics();
