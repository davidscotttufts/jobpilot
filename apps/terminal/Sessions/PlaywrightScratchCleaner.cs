namespace JobPilot.Terminal.Sessions;

/// <summary>
/// Removes top-level Playwright scratch files. It never recurses because browser profiles live beneath the
/// same directory.
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
