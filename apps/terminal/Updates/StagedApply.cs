namespace JobPilot.Terminal.Updates;

/// <summary>
/// Copies a staged release over the install directory as one transaction: every replaced or pruned file
/// is backed up first, and any failure rolls the install back to its pre-apply state.
/// </summary>
internal sealed class StagedApply
{
    private readonly string stagingDir;
    private readonly string installDir;
    private readonly string backupDir;

    private readonly List<(string Target, string Backup)> replaced = [];
    private readonly List<string> created = [];

    private StagedApply(string stagingDir, string installDir)
    {
        this.stagingDir = stagingDir;
        this.installDir = installDir;
        backupDir = installDir.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + ".bak";
    }

    /// <summary>Applies <paramref name="stagingDir"/> onto <paramref name="installDir"/>, rolling back on failure.</summary>
    public static void Run(string stagingDir, string installDir)
    {
        var apply = new StagedApply(stagingDir, installDir);

        ReleaseInstaller.DeleteIfExists(apply.backupDir);
        Directory.CreateDirectory(apply.backupDir);

        try
        {
            apply.CopyStagedFiles();
            apply.PruneRemovedPluginFiles();
        }
        catch
        {
            apply.Rollback();
            throw;
        }
        finally
        {
            try
            {
                ReleaseInstaller.DeleteIfExists(apply.backupDir);
            }
            catch (IOException)
            {
                // A later swap retries backup cleanup.
            }
        }
    }

    private void CopyStagedFiles()
    {
        foreach (var file in Directory.GetFiles(stagingDir, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(stagingDir, file);
            var target = Path.Combine(installDir, relative);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);

            if (File.Exists(target))
            {
                BackUp(target, relative);
            }
            else
            {
                created.Add(target);
            }

            File.Copy(file, target, overwrite: true);
        }
    }

    /// <summary>
    /// Deletes plugin files the new release no longer ships. Only the plugin/ subtree is pruned: the
    /// install dir is also the session working dir, so everything outside it may hold user state.
    /// </summary>
    private void PruneRemovedPluginFiles()
    {
        var stagedPlugin = Path.Combine(stagingDir, "plugin");
        var installedPlugin = Path.Combine(installDir, "plugin");
        if (!Directory.Exists(stagedPlugin) || !Directory.Exists(installedPlugin))
        {
            return;
        }

        foreach (var file in Directory.GetFiles(installedPlugin, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(installedPlugin, file);
            if (File.Exists(Path.Combine(stagedPlugin, relative)))
            {
                continue;
            }

            BackUp(file, Path.Combine("plugin", relative));
            File.Delete(file);
        }

        DeleteEmptyDirectories(installedPlugin);
    }

    private void BackUp(string target, string relative)
    {
        var backup = Path.Combine(backupDir, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(backup)!);
        File.Copy(target, backup, overwrite: true);
        replaced.Add((target, backup));
    }

    private void Rollback()
    {
        foreach (var (target, backup) in replaced)
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                File.Copy(backup, target, overwrite: true);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                // Continue restoring the remaining files.
            }
        }

        foreach (var target in created)
        {
            try
            {
                File.Delete(target);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
            }
        }
    }

    private static void DeleteEmptyDirectories(string root)
    {
        // Deepest first so emptied parents follow their children.
        foreach (var dir in Directory.GetDirectories(root, "*", SearchOption.AllDirectories)
                     .OrderByDescending(d => d.Length))
        {
            try
            {
                if (!Directory.EnumerateFileSystemEntries(dir).Any())
                {
                    Directory.Delete(dir);
                }
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
            }
        }
    }
}
