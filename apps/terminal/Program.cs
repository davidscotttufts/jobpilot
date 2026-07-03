using JobPilot.Terminal.Endpoints;
using JobPilot.Terminal.Hosting;
using JobPilot.Terminal.Plugins;

// Pty.Net's macOS forkpty path requires CoreCLR's W^X remapping to be off; harmless under NativeAOT.
if (OperatingSystem.IsMacOS())
{
    Environment.SetEnvironmentVariable("DOTNET_EnableWriteXorExecute", "0");
}

// Content root = exe dir, not launch CWD, so appsettings.json (pins :4102) loads regardless of where we start.
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
});

builder.Services.AddTerminalHost();

var app = builder.Build();

// Auto-update host + plugin before binding. If the host self-updated it relaunched into the new build,
// so exit and let that process bind the port.
if (await StartupUpdater.RunAsync(app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Updater")))
{
    return;
}

app.UseTerminalPipeline();
app.MapTerminalEndpoints();
app.RunWithPortDiagnostics();
