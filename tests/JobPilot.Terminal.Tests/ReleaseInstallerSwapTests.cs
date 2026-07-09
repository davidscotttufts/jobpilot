using JobPilot.Terminal.Updates;
using Xunit;

namespace JobPilot.Terminal.Tests;

public class ReleaseInstallerSwapTests
{
    private static string Install(TempDir temp) => Path.Combine(temp.Root, "install");

    private static string Staging(TempDir temp) => Path.Combine(temp.Root, "staging");

    [Fact]
    public void ApplyStaged_OverwritesExistingFilesAndAddsNewOnes()
    {
        using var temp = new TempDir();

        temp.File(Path.Combine("install", "jobpilot.exe"), "old binary");
        temp.File(Path.Combine("staging", "jobpilot.exe"), "new binary");
        temp.File(Path.Combine("staging", "plugin", "skills", "new-skill.md"), "fresh");

        ReleaseInstaller.ApplyStaged(Staging(temp), Install(temp));

        Assert.Equal("new binary", File.ReadAllText(Path.Combine(Install(temp), "jobpilot.exe")));
        Assert.Equal("fresh", File.ReadAllText(Path.Combine(Install(temp), "plugin", "skills", "new-skill.md")));
    }

    [Fact]
    public void ApplyStaged_LeavesNoBackupDirectoryBehind()
    {
        using var temp = new TempDir();
        temp.File(Path.Combine("install", "a.txt"), "old");
        temp.File(Path.Combine("staging", "a.txt"), "new");

        ReleaseInstaller.ApplyStaged(Staging(temp), Install(temp));

        Assert.False(Directory.Exists(Install(temp) + ".bak"));
    }

    [Fact]
    public void ApplyStaged_RollsBackReplacedAndCreatedFiles_WhenACopyFails()
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
            Assert.ThrowsAny<IOException>(() => ReleaseInstaller.ApplyStaged(Staging(temp), Install(temp)));
        }

        // Replaced files are restored and newly introduced files are removed.
        Assert.Equal("original-a", File.ReadAllText(Path.Combine(Install(temp), "a.txt")));
        Assert.Equal("original-z", File.ReadAllText(locked));
        Assert.False(File.Exists(Path.Combine(Install(temp), "b-new.txt")));
        Assert.False(Directory.Exists(Install(temp) + ".bak"));
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
