using System.Text.Json;
using JobPilot.Terminal.Models;

namespace JobPilot.Terminal.Plugins;

/// <summary>
/// Refreshes the bundled plugin/ tree from the latest <c>v*</c> release at startup - the fast,
/// no-relaunch path (a directory swap), so skills stay current even when the <see cref="HostUpdater"/>
/// binary swap defers. No-ops on any failure (the bundled copy stays); the caller supplies the shared
/// releases list, the resolved plugin dir, and does the dev-checkout guard.
/// </summary>
public static class PluginUpdater
{
    private const string AssetName = "jobpilot-plugin.tar.gz";

    /// <summary>Updates the bundled plugin if a newer release exists, swallowing all failures.</summary>
    public static async Task TryUpdateAsync(ILogger logger, HttpClient http, GitHubRelease[] releases, string pluginDir, CancellationToken ct)
    {
        try
        {
            await UpdateAsync(logger, http, releases, pluginDir, ct);
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Plugin auto-update skipped; using the bundled plugin.");
        }
    }

    private static async Task UpdateAsync(ILogger logger, HttpClient http, GitHubRelease[] releases, string pluginDir, CancellationToken ct)
    {
        var current = ReadVersion(Path.Combine(pluginDir, ".claude-plugin", "plugin.json"));
        if (current is null)
        {
            logger.LogInformation("Could not read the installed plugin version; skipping auto-update.");
            return;
        }

        var latest = ReleaseUpdates.SelectLatestAbove(releases, current);
        if (latest is null)
        {
            logger.LogInformation("Plugin is up to date (v{Current}).", current);
            return;
        }

        var asset = latest.Value.Release.Assets?.FirstOrDefault(a => string.Equals(a.Name, AssetName, StringComparison.Ordinal));
        if (asset?.DownloadUrl is null)
        {
            logger.LogInformation("Release {Tag} has no {Asset} asset; skipping.", latest.Value.Release.TagName, AssetName);
            return;
        }

        logger.LogInformation("Updating plugin v{Current} -> v{Next}.", current, latest.Value.Version);
        await SwapAsync(http, asset.DownloadUrl, pluginDir, ct);
        logger.LogInformation("Plugin updated to v{Next}.", latest.Value.Version);
    }

    /// <summary>
    /// Downloads and extracts the plugin tarball into a staging dir, validates it, then swaps it into
    /// place via two directory moves so the live plugin dir is never left partial.
    /// </summary>
    private static async Task SwapAsync(HttpClient http, string url, string pluginDir, CancellationToken ct)
    {
        var staging = pluginDir + ".new";
        var backup = pluginDir + ".old";
        ReleaseUpdates.DeleteIfExists(staging);
        Directory.CreateDirectory(staging);

        await ReleaseUpdates.DownloadAndExtractAsync(http, url, staging, ct);

        if (!IsValidPlugin(staging))
        {
            ReleaseUpdates.DeleteIfExists(staging);
            throw new InvalidOperationException("Downloaded plugin failed validation; keeping the bundled copy.");
        }

        ReleaseUpdates.DeleteIfExists(backup);
        Directory.Move(pluginDir, backup);
        try
        {
            Directory.Move(staging, pluginDir);
        }
        catch
        {
            Directory.Move(backup, pluginDir); // roll back to the previous plugin
            throw;
        }
        Directory.Delete(backup, recursive: true);
    }

    private static bool IsValidPlugin(string dir)
    {
        return File.Exists(Path.Combine(dir, ".claude-plugin", "plugin.json"))
            && File.Exists(Path.Combine(dir, ".codex-plugin", "plugin.json"))
            && File.Exists(Path.Combine(dir, "skills", "shared", "setup.md"));
    }

    private static Version? ReadVersion(string manifestPath)
    {
        try
        {
            if (!File.Exists(manifestPath))
            {
                return null;
            }
            var manifest = JsonSerializer.Deserialize(File.ReadAllText(manifestPath), AppJsonContext.Default.PluginManifest);
            return manifest?.Version is { } value && Version.TryParse(value, out var parsed) ? parsed : null;
        }
        catch
        {
            return null;
        }
    }
}
