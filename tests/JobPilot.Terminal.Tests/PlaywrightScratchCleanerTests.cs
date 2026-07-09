using JobPilot.Terminal.Sessions;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace JobPilot.Terminal.Tests;

public class PlaywrightScratchCleanerTests
{
    private static void Clean(string workingDir) =>
        PlaywrightScratchCleaner.Clean(workingDir, NullLogger.Instance);

    [Fact]
    public void Clean_RemovesTopLevelScratchFiles()
    {
        using var temp = new TempDir();
        temp.File(Path.Combine(".playwright-mcp", "page.png"));
        temp.File(Path.Combine(".playwright-mcp", "console.log"));
        temp.File(Path.Combine(".playwright-mcp", "snapshot.md"));
        temp.File(Path.Combine(".playwright-mcp", "resume.pdf"));

        Clean(temp.Root);

        Assert.Empty(Directory.GetFiles(Path.Combine(temp.Root, ".playwright-mcp")));
    }

    [Fact]
    public void Clean_LeavesUnknownExtensionsAlone()
    {
        using var temp = new TempDir();
        var keep = temp.File(Path.Combine(".playwright-mcp", "state.sqlite"));
        var drop = temp.File(Path.Combine(".playwright-mcp", "page.png"));

        Clean(temp.Root);

        Assert.True(File.Exists(keep));
        Assert.False(File.Exists(drop));
    }

    [Fact]
    public void Clean_NeverTouchesTheBrowserProfileSubdirectory()
    {
        using var temp = new TempDir();
        var cookies = temp.File(Path.Combine(".playwright-mcp", "Default", "Cookies.json"));
        var localState = temp.File(Path.Combine(".playwright-mcp", "Default", "Local State.json"));

        Clean(temp.Root);

        Assert.True(File.Exists(cookies));
        Assert.True(File.Exists(localState));
    }

    [Fact]
    public void Clean_IsANoOp_WhenTheScratchDirectoryIsAbsent()
    {
        using var temp = new TempDir();

        Clean(temp.Root); // must not throw

        Assert.Empty(Directory.GetDirectories(temp.Root));
    }

    [Fact]
    public void Clean_MatchesExtensionsCaseInsensitively()
    {
        using var temp = new TempDir();
        var upper = temp.File(Path.Combine(".playwright-mcp", "SHOT.PNG"));

        Clean(temp.Root);

        Assert.False(File.Exists(upper));
    }
}
