using Microsoft.Extensions.DependencyInjection;

namespace JobPilot.Terminal.Pty;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddTerminal(this IServiceCollection services)
    {
        services.AddSingleton<PtyService>();
        return services;
    }
}
