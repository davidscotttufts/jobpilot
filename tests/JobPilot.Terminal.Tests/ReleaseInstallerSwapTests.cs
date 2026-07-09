using JobPilot.Terminal.Updates;
using Xunit;

namespace JobPilot.Terminal.Tests;

/// <summary>
/// The staged-file swap. A real self-update needs a published install and a GitHub release, so this is the
/// only place the rollback path is ever exercised: a mid-copy failure must restore the whole installation,
/// not just the executable.
/// </summary>
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

        // "a" copies fine; "z-locked" is held open, so the copy over it throws part-way through.
        temp.File(Path.Combine("install", "a.txt"), "original-a");
        var locked = temp.File(Path.Combine("install", "z-locked.txt"), "original-z");
        temp.File(Path.Combine("staging", "a.txt"), "updated-a");
        temp.File(Path.Combine("staging", "b-new.txt"), "brand-new");
        temp.File(Path.Combine("staging", "z-locked.txt"), "updated-z");

        using (new FileStream(locked, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
        {
            Assert.ThrowsAny<IOException>(() => ReleaseInstaller.ApplyStaged(Staging(temp), Install(temp)));
        }

        // The old plugin tree used to survive half-upgraded; every replaced file must come back.
        Assert.Equal("original-a", File.ReadAllText(Path.Combine(Install(temp), "a.txt")));
        Assert.Equal("original-z", File.ReadAllText(locked));
        // ...and every file the swap introduced must be gone.
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
