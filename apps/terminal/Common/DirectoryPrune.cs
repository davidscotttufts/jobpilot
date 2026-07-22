namespace JobPilot.Terminal.Common;

internal static class DirectoryPrune
{
    /// <summary>Removes empty directories beneath <paramref name="root"/>, keeping the root itself.</summary>
    public static void DeleteEmptyDirectories(string root)
    {
        if (!Directory.Exists(root))
        {
            return;
        }

        // Deepest first so a chain of emptied parents collapses in one pass.
        foreach (var dir in Directory.EnumerateDirectories(root, "*", SearchOption.AllDirectories)
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
