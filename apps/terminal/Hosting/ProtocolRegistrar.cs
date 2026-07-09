using Microsoft.Win32;

namespace JobPilot.Terminal.Hosting;

/// <summary>Manages the Windows <c>jobpilot://</c> URL scheme.</summary>
public sealed class ProtocolRegistrar(ILogger<ProtocolRegistrar> logger)
{
    private const string Scheme = "jobpilot";
    private const string SchemePrefix = $"{Scheme}://";

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

            var command = $"\"{exePath}\" \"%1\"";
            using var commandKey = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{Scheme}\shell\open\command");

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
