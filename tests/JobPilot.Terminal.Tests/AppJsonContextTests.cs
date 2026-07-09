using System.Text.Json;
using JobPilot.Terminal.Contracts;
using Xunit;

namespace JobPilot.Terminal.Tests;

public class AppJsonContextTests
{
    [Fact]
    public void TerminalClientMessage_DeserializesTheInputEnvelopeTheBrowserSends()
    {
        var message = JsonSerializer.Deserialize(
            """{"type":"input","data":"aGVsbG8="}""", AppJsonContext.Default.TerminalClientMessage);

        Assert.NotNull(message);
        Assert.Equal("input", message!.Type);
        Assert.Equal("aGVsbG8=", message.Data);
        Assert.Equal("hello"u8.ToArray(), Convert.FromBase64String(message.Data!));
    }

    [Fact]
    public void TerminalClientMessage_DeserializesTheResizeEnvelopeTheBrowserSends()
    {
        var message = JsonSerializer.Deserialize(
            """{"type":"resize","cols":120,"rows":40}""", AppJsonContext.Default.TerminalClientMessage);

        Assert.NotNull(message);
        Assert.Equal("resize", message!.Type);
        Assert.Equal(120, message.Cols);
        Assert.Equal(40, message.Rows);
    }

    [Fact]
    public void TerminalClientMessage_LeavesAbsentFieldsNull_SoAMalformedResizeCannotThrow()
    {
        var message = JsonSerializer.Deserialize(
            """{"type":"resize"}""", AppJsonContext.Default.TerminalClientMessage);

        Assert.Null(message!.Cols);
        Assert.Null(message.Rows);
    }

    [Fact]
    public void TerminalClientMessage_IgnoresUnknownProperties()
    {
        var message = JsonSerializer.Deserialize(
            """{"type":"input","data":"aGk=","nonsense":42}""", AppJsonContext.Default.TerminalClientMessage);

        Assert.Equal("input", message!.Type);
    }

    [Fact]
    public void SessionStatus_SerializesCamelCase_ThroughTheContextsOwnOptions()
    {
        var json = JsonSerializer.Serialize(
            new SessionStatus
            {
                Status = "ok",
                Session = "stopped",
                Provider = "claude",
                Providers = [new TerminalProviderInfo("claude", "Claude Code")],
                HostVersion = "2.0.8",
                CanRelaunch = true,
                CanUpdate = false,
            },
            AppJsonContext.Default.SessionStatus);

        Assert.Contains("\"hostVersion\":\"2.0.8\"", json);
        Assert.Contains("\"canRelaunch\":true", json);
        Assert.Contains("\"displayName\":\"Claude Code\"", json);
        Assert.DoesNotContain("HostVersion", json);
    }

    [Fact]
    public void ProblemDetails_SerializesTheLowercaseFieldsTheWebReads()
    {
        var json = JsonSerializer.Serialize(
            new Microsoft.AspNetCore.Mvc.ProblemDetails { Title = "t", Detail = "d", Status = 500 },
            AppJsonContext.Default.ProblemDetails);

        Assert.Contains("\"detail\":\"d\"", json);
        Assert.Contains("\"title\":\"t\"", json);
    }
}
