using JobPilot.Terminal.Common;
using JobPilot.Terminal.Hosting;
using Microsoft.Extensions.Hosting;

namespace JobPilot.Terminal.Sessions;

/// <summary>
/// Owns workspace scratch cleanup: a full Playwright sweep at session start plus a periodic aged
/// sweep of .temp and .playwright-mcp. Playwright cleaning never recurses because browser profiles
/// live beneath the same directory.
/// </summary>
public sealed class ScratchCleaner(HostInstall install, ILogger<ScratchCleaner> logger) : BackgroundService
{
    /// <summary>Scratch files older than this are removed by the aged sweeps.</summary>
    public static readonly TimeSpan Retention = TimeSpan.FromHours(24);

    /// <summary>Interval between background sweeps.</summary>
    public static readonly TimeSpan SweepInterval = TimeSpan.FromHours(6);

    // Lets Kestrel finish binding before the first sweep touches the disk.
    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(1);

    private static readonly string[] PlaywrightScratchExtensions =
        [".log", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".md", ".json", ".yml", ".yaml"];

    /// <summary>Cleans before a provider session spawns: every Playwright scratch file plus aged .temp files.</summary>
    public void CleanSessionStart(string workingDir)
    {
        CleanPlaywright(workingDir, maxAge: null);
        CleanTemp(workingDir);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
            using var timer = new PeriodicTimer(SweepInterval);
            do
            {
                // A degraded host (no plugin tree) has no workspace to clean. The playwright sweep is
                // age-gated so it can't yank a file the live browser session just wrote.
                if (install.Paths is { } paths)
                {
                    CleanTemp(paths.WorkingDir);
                    CleanPlaywright(paths.WorkingDir, Retention);
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            // Host shutdown.
        }
    }

    /// <summary>Deletes aged files anywhere under .temp (the whole tree is scratch), then prunes emptied subdirectories.</summary>
    internal void CleanTemp(string workingDir)
    {
        var dir = Path.Combine(workingDir, ".temp");
        DeleteFiles(dir, SearchOption.AllDirectories, extensions: null, DateTime.UtcNow - Retention);
        DirectoryPrune.DeleteEmptyDirectories(dir);
    }

    /// <summary>Deletes top-level Playwright scratch files; a null <paramref name="maxAge"/> removes them regardless of age.</summary>
    internal void CleanPlaywright(string workingDir, TimeSpan? maxAge) =>
        DeleteFiles(
            Path.Combine(workingDir, ".playwright-mcp"),
            SearchOption.TopDirectoryOnly,
            PlaywrightScratchExtensions,
            maxAge is { } age ? DateTime.UtcNow - age : null);

    private void DeleteFiles(string dir, SearchOption depth, string[]? extensions, DateTime? cutoff)
    {
        if (!Directory.Exists(dir))
        {
            return;
        }

        var removed = 0;
        foreach (var file in Directory.EnumerateFiles(dir, "*", depth))
        {
            if (extensions is not null
                && !extensions.Contains(Path.GetExtension(file), StringComparer.OrdinalIgnoreCase))
            {
                continue;
            }

            try
            {
                if (cutoff is { } c && File.GetLastWriteTimeUtc(file) > c)
                {
                    continue;
                }

                File.Delete(file);
                removed++;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                // A locked or in-use file is picked up by a later sweep.
            }
        }

        if (removed > 0)
        {
            logger.LogInformation("Cleaned {Count} scratch file(s) from {Dir}.", removed, dir);
        }
    }
}
