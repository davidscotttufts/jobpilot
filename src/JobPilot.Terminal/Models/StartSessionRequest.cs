namespace JobPilot.Terminal.Models;

public sealed record StartSessionRequest(int Cols, int Rows, string? WorkingDir = null);
