using JobPilot.Terminal.Updates;
using Xunit;

namespace JobPilot.Terminal.Tests;

public class StagedApplyTests
{
    private static string Install(TempDir temp) => Path.Combine(temp.Root, "install");

    private static string Staging(TempDir temp) => Path.Combine(temp.Root, "staging");

    [Fact]
    public void Run_OverwritesExistingFilesAndAddsNewOnes()
    {
        using var temp = new TempDir();

        temp.File(Path.Combine("install", "jobpilot.exe"), "old binary");
        temp.File(Path.Combine("staging", "jobpilot.exe"), "new binary");
        temp.File(Path.Combine("staging", "plugin", "skills", "new-skill.md"), "fresh");

        StagedApply.Run(Staging(temp), Install(temp));

        Assert.Equal("new binary", File.ReadAllText(Path.Combine(Install(temp), "jobpilot.exe")));
        Assert.Equal("fresh", File.ReadAllText(Path.Combine(Install(temp), "plugin", "skills", "new-skill.md")));
    }

    [Fact]
    public void Run_LeavesNoBackupDirectoryBehind()
    {
        using var temp = new TempDir();
        temp.File(Path.Combine("install", "a.txt"), "old");
        temp.File(Path.Combine("staging", "a.txt"), "new");

        StagedApply.Run(Staging(temp), Install(temp));

        Assert.False(Directory.Exists(Install(temp) + ".bak"));
    }

    [Fact]
    public void Run_RollsBackReplacedAndCreatedFiles_WhenACopyFails()
    {
        using var temp = new TempDir();

        // Lock the final target so earlier staged writes must be rolled back.
        temp.File(Path.Combine("install", "a.txt"), "original-a");
        var locked = temp.File(Path.Combine("install", "z-locked.txt"), "original-z");
        temp.File(Path.Combine("staging", "a.txt"), "updated-a");
        temp.File(Path.Combine("staging", "b-new.txt"), "brand-new");
        temp.File(Path.Combine("staging", "z-locked.txt"), "updated-z");

        using (new FileStream(locked, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
        {
            Assert.ThrowsAny<IOException>(() => StagedApply.Run(Staging(temp), Install(temp)));
        }

        // Replaced files are restored and newly introduced files are removed.
        Assert.Equal("original-a", File.ReadAllText(Path.Combine(Install(temp), "a.txt")));
        Assert.Equal("original-z", File.ReadAllText(locked));
        Assert.False(File.Exists(Path.Combine(Install(temp), "b-new.txt")));
        Assert.False(Directory.Exists(Install(temp) + ".bak"));
    }

    [Fact]
    public void Run_PrunesPluginFilesTheNewReleaseNoLongerShips()
    {
        using var temp = new TempDir();

        temp.File(Path.Combine("install", "plugin", "skills", "kept", "SKILL.md"), "old");
        temp.File(Path.Combine("install", "plugin", "skills", "removed", "SKILL.md"), "stale");
        temp.File(Path.Combine("staging", "plugin", "skills", "kept", "SKILL.md"), "new");

        StagedApply.Run(Staging(temp), Install(temp));

        Assert.Equal("new", File.ReadAllText(Path.Combine(Install(temp), "plugin", "skills", "kept", "SKILL.md")));
        Assert.False(File.Exists(Path.Combine(Install(temp), "plugin", "skills", "removed", "SKILL.md")));
        Assert.False(Directory.Exists(Path.Combine(Install(temp), "plugin", "skills", "removed")));
    }

    [Fact]
    public void Run_NeverPrunesOutsideThePluginSubtree()
    {
        using var temp = new TempDir();

        // The install dir doubles as the session working dir; user state there must survive updates.
        temp.File(Path.Combine("install", "user-notes.md"), "user state");
        temp.File(Path.Combine("install", "plugin", "skills", "a.md"), "old");
        temp.File(Path.Combine("staging", "plugin", "skills", "a.md"), "new");

        StagedApply.Run(Staging(temp), Install(temp));

        Assert.Equal("user state", File.ReadAllText(Path.Combine(Install(temp), "user-notes.md")));
    }

    [Fact]
    public void IsValidHost_RequiresBothTheBinaryAndTheClaudeManifest()
    {
        using var temp = new TempDir();

        Assert.False(ReleaseInstaller.IsValidHost(temp.Root, "jobpilot"));

        temp.File("jobpilot", "binary");
        Assert.False(ReleaseInstaller.IsValidHost(temp.Root, "jobpilot"));

        temp.File(Path.Combine("plugin", ".claude-plugin", "plugin.json"));
        Assert.True(ReleaseInstaller.IsValidHost(temp.Root, "jobpilot"));
    }
}
