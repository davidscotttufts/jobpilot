using System.Formats.Tar;
using System.IO.Compression;
using System.Net.Http.Headers;
using System.Text.Json;
using JobPilot.Terminal.Models;
using JobPilot.Terminal.Sessions;

namespace JobPilot.Terminal.Plugins;

/// <summary>
/// Shared plumbing for the startup auto-updaters (<see cref="PluginUpdater"/>, <see cref="HostUpdater"/>):
/// a GitHub client, one releases fetch, release selection, archive download/extract, and the dev-checkout
/// guard. Both key on the <c>v*</c> tag and run off a single fetched releases list.
/// </summary>
internal static class ReleaseUpdates
{
    private const string ReleasesUrl = "https://api.github.com/repos/suxrobGM/jobpilot/releases?per_page=30";

    /// <summary>Tag prefix for the unified host+plugin version line (<c>vX.Y.Z</c>).</summary>
    public const string TagPrefix = "v";

    public static HttpClient CreateClient()
    {
        var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
        http.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("jobpilot-terminal", SessionManager.HostVersion));
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        return http;
    }

    /// <summary>Fetches the releases list once (both updaters run off it); null if the payload can't be parsed.</summary>
    public static async Task<GitHubRelease[]?> FetchReleasesAsync(HttpClient http, CancellationToken ct)
    {
        var json = await http.GetStringAsync(ReleasesUrl, ct);
        return JsonSerializer.Deserialize(json, AppJsonContext.Default.GitHubReleaseArray);
    }

    /// <summary>Highest <c>vX.Y.Z</c> release newer than <paramref name="current"/>, or null if up to date.</summary>
    public static (GitHubRelease Release, Version Version)? SelectLatestAbove(GitHubRelease[] releases, Version current)
    {
        GitHubRelease? best = null;
        Version? bestVersion = null;
        foreach (var release in releases)
        {
            if (release.TagName is null || !release.TagName.StartsWith(TagPrefix, StringComparison.Ordinal))
            {
                continue;
            }
            if (!Version.TryParse(release.TagName[TagPrefix.Length..], out var version))
            {
                continue;
            }
            if (bestVersion is null || version > bestVersion)
            {
                bestVersion = version;
                best = release;
            }
        }

        return best is not null && bestVersion is not null && bestVersion > current ? (best, bestVersion) : null;
    }

    /// <summary>Downloads the asset to a temp file and extracts it into <paramref name="destDir"/>, choosing zip or gzip+tar by extension.</summary>
    public static async Task DownloadAndExtractAsync(HttpClient http, string url, string destDir, CancellationToken ct)
    {
        var archive = Path.GetTempFileName();
        try
        {
            await using (var download = await http.GetStreamAsync(url, ct))
            await using (var file = File.Create(archive))
            {
                await download.CopyToAsync(file, ct);
            }

            if (url.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                ZipFile.ExtractToDirectory(archive, destDir, overwriteFiles: true);
            }
            else
            {
                await using var file = File.OpenRead(archive);
                await using var gzip = new GZipStream(file, CompressionMode.Decompress);
                TarFile.ExtractToDirectory(gzip, destDir, overwriteFiles: true);
            }
        }
        finally
        {
            File.Delete(archive);
        }
    }

    /// <summary>
    /// True when <paramref name="path"/> sits under the published binary's dir; false in a dev checkout
    /// (assets resolve to the repo root there), so updaters never overwrite a source tree.
    /// </summary>
    public static bool IsPublishedInstall(string path)
    {
        var baseDir = Path.GetFullPath(AppContext.BaseDirectory);
        return Path.GetFullPath(path).StartsWith(baseDir, StringComparison.OrdinalIgnoreCase);
    }

    public static void DeleteIfExists(string dir)
    {
        if (Directory.Exists(dir))
        {
            Directory.Delete(dir, recursive: true);
        }
    }
}
