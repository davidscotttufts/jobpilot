using System.Diagnostics;
using System.Formats.Tar;
using System.Globalization;
using System.IO.Compression;

namespace JobPilot.Terminal.Updates;

/// <summary>Update relaunch behavior.</summary>
public enum RelaunchMode
{
    /// <summary>The predecessor did not bind the port.</summary>
    Startup,

    /// <summary>The child waits for the running predecessor.</summary>
    Runtime,
}

/// <summary>Downloads, validates, and installs host releases.</summary>
public sealed class ReleaseInstaller(GitHubReleaseClient releases, ILogger<ReleaseInstaller> logger)
{
    /// <summary>
    /// Stages and validates a release, renames the running executable, and rolls back files if copying fails.
    /// </summary>
    public async Task SwapAsync(string url, string exePath, string installDir, CancellationToken ct)
    {
        var staging = installDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + ".new";
        DeleteIfExists(staging);
        Directory.CreateDirectory(staging);

        try
        {
            await DownloadAndExtractAsync(url, staging, ct);

            var exeName = Path.GetFileName(exePath);
            if (!IsValidHost(staging, exeName))
            {
                throw new InvalidOperationException("Downloaded host failed validation; keeping the current binary.");
            }

            var oldExe = exePath + ".old";
            File.Delete(oldExe);
            File.Move(exePath, oldExe);
            try
            {
                StagedApply.Run(staging, installDir);
            }
            catch
            {
                File.Move(oldExe, exePath, overwrite: true);
                throw;
            }

            if (!OperatingSystem.IsWindows())
            {
                File.Delete(oldExe); // Windows keeps the running image until the next startup.
            }
        }
        finally
        {
            DeleteIfExists(staging);
        }
    }

    /// <summary>Deletes the previous executable after its process exits.</summary>
    public void CleanupPreviousSwap()
    {
        if (Environment.ProcessPath is null)
        {
            return;
        }
        try
        {
            File.Delete(Environment.ProcessPath + ".old");
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Could not remove the previous host binary; it will be retried next startup.");
        }
    }

    /// <summary>Launches the installed binary with the current arguments.</summary>
    public void Relaunch(string exePath, RelaunchMode mode)
    {
        var psi = new ProcessStartInfo
        {
            FileName = exePath,
            UseShellExecute = false,
            WorkingDirectory = Environment.CurrentDirectory,
        };
        foreach (var arg in Environment.GetCommandLineArgs().Skip(1))
        {
            psi.ArgumentList.Add(arg);
        }
        psi.Environment[HostHandoff.JustUpdatedVar] = "1";
        if (mode == RelaunchMode.Runtime)
        {
            psi.Environment[HostHandoff.AwaitPidVar] = Environment.ProcessId.ToString(CultureInfo.InvariantCulture);
        }
        Process.Start(psi);
    }

    /// <summary>Downloads and extracts a release archive.</summary>
    private async Task DownloadAndExtractAsync(string url, string destDir, CancellationToken ct)
    {
        var archive = Path.GetTempFileName();
        try
        {
            await releases.DownloadAsync(url, archive, ct);

            if (url.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                ZipFile.ExtractToDirectory(archive, destDir, overwriteFiles: true);
            }
            else
            {
                await using var file = File.OpenRead(archive);
                await using var gzip = new GZipStream(file, CompressionMode.Decompress);
                TarFile.ExtractToDirectory(gzip, destDir, overwriteFiles: true);
            }
        }
        finally
        {
            File.Delete(archive);
        }
    }

    public static void DeleteIfExists(string dir)
    {
        if (Directory.Exists(dir))
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    /// <summary>Checks the minimum release payload.</summary>
    internal static bool IsValidHost(string dir, string exeName)
    {
        return File.Exists(Path.Combine(dir, exeName))
            && File.Exists(Path.Combine(dir, "plugin", ".claude-plugin", "plugin.json"));
    }
}
