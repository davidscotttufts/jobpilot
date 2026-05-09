namespace JobPilot.Terminal.Models;

public sealed record StartSessionRequest(string WorkingDir, int Cols, int Rows);
