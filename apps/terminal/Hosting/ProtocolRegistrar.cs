using System.Runtime.Versioning;
using Microsoft.Win32;

namespace JobPilot.Terminal.Hosting;

/// <summary>Manages the Windows <c>jobpilot://</c> URL scheme.</summary>
public sealed class ProtocolRegistrar(ILogger<ProtocolRegistrar> logger)
{
    private const string Scheme = "jobpilot";
    private const string SchemePrefix = $"{Scheme}://";
    private const string CommandKey = $@"Software\Classes\{Scheme}\shell\open\command";

    /// <summary>Whether registration succeeded.</summary>
    public bool IsRegistered { get; private set; }

    /// <summary>Removes the protocol argument and hides its console window.</summary>
    public static string[] ResolveHostArgs(string[] args)
    {
        var hostArgs = args.Where(a => !a.StartsWith(SchemePrefix, StringComparison.OrdinalIgnoreCase)).ToArray();
        if (hostArgs.Length != args.Length && OperatingSystem.IsWindows())
        {
            NativeMethods.FreeConsole();
        }
        return hostArgs;
    }

    /// <summary>Registers the current executable as the protocol handler.</summary>
    public void EnsureRegistered()
    {
        if (!OperatingSystem.IsWindows())
        {
            return;
        }

        try
        {
            var exePath = Environment.ProcessPath;
            if (string.IsNullOrEmpty(exePath))
            {
                return;
            }

            // A build output must not own the scheme: the dashboard would launch a binary whose plugin
            // tree is the repo's, not the one it shipped with. Only a published install may claim it.
            if (!HostInstall.IsPublishedHost)
            {
                IsRegistered = ReleaseScheme(exePath);
                return;
            }

            var command = $"\"{exePath}\" \"%1\"";
            using var commandKey = Registry.CurrentUser.CreateSubKey(CommandKey);

            if ((commandKey.GetValue(null) as string) != command)
            {
                using var schemeKey = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{Scheme}");
                schemeKey.SetValue(null, "URL:JobPilot Protocol");
                schemeKey.SetValue("URL Protocol", "");
                commandKey.SetValue(null, command);
                logger.LogInformation("Registered {Scheme}:// URL scheme.", Scheme);
            }

            IsRegistered = true;
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Could not register the {Scheme}:// URL scheme; skipping.", Scheme);
        }
    }

    /// <summary>
    /// Undoes a hijack an earlier build output left behind; keeps an installed host's registration.
    /// Returns whether the scheme still points at some other host.
    /// </summary>
    [SupportedOSPlatform("windows")]
    private bool ReleaseScheme(string exePath)
    {
        using var commandKey = Registry.CurrentUser.OpenSubKey(CommandKey);
        if (commandKey?.GetValue(null) is not string command || command.Length == 0)
        {
            return false;
        }

        if (!command.Contains(exePath, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        Unregister(logger);
        return false;
    }

    /// <summary>Removes the protocol handler during uninstall.</summary>
    public static void Unregister(ILogger logger)
    {
        if (!OperatingSystem.IsWindows())
        {
            return;
        }

        try
        {
            Registry.CurrentUser.DeleteSubKeyTree($@"Software\Classes\{Scheme}", throwOnMissingSubKey: false);
            logger.LogInformation("Removed {Scheme}:// URL scheme.", Scheme);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Could not remove the {Scheme}:// URL scheme; skipping.", Scheme);
        }
    }
}
