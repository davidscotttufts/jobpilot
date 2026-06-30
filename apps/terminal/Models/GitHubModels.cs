using System.Text.Json.Serialization;

namespace JobPilot.Terminal.Models;

/// <summary>A GitHub release, as returned by the releases API (only the fields we read).</summary>
public sealed record GitHubRelease(
    [property: JsonPropertyName("tag_name")] string? TagName,
    [property: JsonPropertyName("assets")] GitHubAsset[]? Assets);

/// <summary>A downloadable asset attached to a GitHub release.</summary>
public sealed record GitHubAsset(
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("browser_download_url")] string? DownloadUrl);

/// <summary>The subset of a plugin manifest the host reads to learn the installed version.</summary>
public sealed record PluginManifest(
    [property: JsonPropertyName("version")] string? Version);
