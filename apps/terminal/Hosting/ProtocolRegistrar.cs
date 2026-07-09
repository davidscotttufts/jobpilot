using Microsoft.Win32;

namespace JobPilot.Terminal.Hosting;

/// <summary>
/// Registers the <c>jobpilot://</c> URL scheme under HKCU so the dashboard can launch the offline host
/// from the browser. Windows-only, idempotent, never throws - runs on every startup so a normal launch
/// establishes it and it survives self-updates (the install-dir exe path is stable and re-written each boot).
/// </summary>
public sealed class ProtocolRegistrar(ILogger<ProtocolRegistrar> logger)
{
    private const string Scheme = "jobpilot";
    private const string SchemePrefix = $"{Scheme}://";

    /// <summary>True once the scheme is registered, so /healthz can tell the dashboard the browser can relaunch us.</summary>
    public bool IsRegistered { get; private set; }

    /// <summary>
    /// On a <c>jobpilot://</c> launch, drops the flashed console window and strips the scheme arg (which
    /// ASP.NET config binding rejects). Returns the args to hand the host builder.
    /// </summary>
    /// <remarks>Pure, and runs before the container exists - hence static.</remarks>
    public static string[] ResolveHostArgs(string[] args)
    {
        var hostArgs = args.Where(a => !a.StartsWith(SchemePrefix, StringComparison.OrdinalIgnoreCase)).ToArray();
        if (hostArgs.Length != args.Length && OperatingSystem.IsWindows())
        {
            NativeMethods.FreeConsole();
        }
        return hostArgs;
    }

    /// <summary>Writes the scheme keys, recording success in <see cref="IsRegistered"/>.</summary>
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

            // Idempotent: skip the write when the command already points at this exe.
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
    /// Removes the <c>jobpilot://</c> scheme keys - for uninstall, so a deleted install doesn't leave a
    /// dead handler behind. No-op unless Windows; never throws.
    /// </summary>
    /// <remarks>The <c>--unregister</c> path exits before a host is built, so this stays static.</remarks>
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
