export interface BrowserTelemetryConfig {
  serviceName: string;
  sentryDsn?: string;
  posthogKey?: string;
  posthogHost?: string;
  environment?: string;
}

export async function initBrowserTelemetry(config: BrowserTelemetryConfig): Promise<void> {
  if (config.sentryDsn) {
    try {
      const Sentry = await import("@sentry/browser");
      Sentry.init({ dsn: config.sentryDsn, environment: config.environment });
    } catch {
      /* sentry/browser not installed */
    }
  }
  if (config.posthogKey) {
    try {
      const posthog = (await import("posthog-js")).default;
      posthog.init(config.posthogKey, {
        api_host: config.posthogHost ?? "https://us.i.posthog.com",
      });
    } catch {
      /* posthog-js not installed */
    }
  }
}
