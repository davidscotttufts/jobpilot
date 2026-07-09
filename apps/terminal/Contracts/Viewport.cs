namespace JobPilot.Terminal.Contracts;

/// <summary>Shared terminal viewport bounds.</summary>
public static class Viewport
{
    public const int MinSize = 1;
    public const int MaxSize = 2000;

    public static bool IsValid(int cols, int rows) =>
        cols is >= MinSize and <= MaxSize && rows is >= MinSize and <= MaxSize;
}
