namespace JobPilot.Terminal.Sessions;

/// <summary>
/// Best-effort removal of scratch files (page snapshots, screenshots, downloaded PDFs, console logs)
/// left by Playwright MCP in the previous session. Only top-level files with a known scratch
/// extension are deleted; the browser profile (Default/, caches, Local State, …) is never touched.
/// Failures (e.g. a file still locked by a closing browser) are ignored.
/// </summary>
public static class PlaywrightScratchCleaner
{
    private static readonly string[] ScratchExtensions =
        [".log", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".md", ".json", ".yml", ".yaml"];

    /// <summary>Deletes Playwright scratch files under <paramref name="workingDir"/>/.playwright-mcp.</summary>
    public static void Clean(string workingDir, ILogger logger)
    {
        var dir = Path.Combine(workingDir, ".playwright-mcp");
        if (!Directory.Exists(dir))
        {
            return;
        }

        var removed = 0;
        foreach (var file in Directory.EnumerateFiles(dir, "*", SearchOption.TopDirectoryOnly))
        {
            if (!ScratchExtensions.Contains(Path.GetExtension(file), StringComparer.OrdinalIgnoreCase))
            {
                continue;
            }

            try
            {
                File.Delete(file);
                removed++;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                logger.LogDebug(ex, "Could not delete Playwright scratch file {File}.", file);
            }
        }

        if (removed > 0)
        {
            logger.LogInformation("Cleaned {Count} Playwright scratch file(s) from {Dir}.", removed, dir);
        }
    }
}
