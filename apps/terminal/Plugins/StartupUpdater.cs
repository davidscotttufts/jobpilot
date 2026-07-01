using JobPilot.Terminal.Sessions;

namespace JobPilot.Terminal.Plugins;

/// <summary>
/// Startup entry point that runs both auto-updaters off a single releases fetch, before the server
/// binds (so no session spawns mid-swap). No-ops in a dev checkout or offline. Returns true when the
/// host self-updated and relaunched - the caller should exit without binding so the new build takes over.
/// </summary>
public static class StartupUpdater
{
    public static async Task<bool> RunAsync(ILogger logger)
    {
        try
        {
            var pluginDir = TerminalSessionPaths.Resolve().ClaudePluginDir;
            if (!ReleaseUpdates.IsPublishedInstall(pluginDir))
            {
                logger.LogInformation("Not a published install (dev checkout); skipping auto-update.");
                return false;
            }

            using var http = ReleaseUpdates.CreateClient();
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(20));
            var releases = await ReleaseUpdates.FetchReleasesAsync(http, cts.Token);
            if (releases is null)
            {
                return false;
            }

            if (await HostUpdater.TryUpdateAsync(logger, http, releases, cts.Token))
            {
                return true;
            }
            await PluginUpdater.TryUpdateAsync(logger, http, releases, pluginDir, cts.Token);
            return false;
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Auto-update skipped; keeping the current install.");
            return false;
        }
    }
}
