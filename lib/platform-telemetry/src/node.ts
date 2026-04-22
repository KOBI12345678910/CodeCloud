/**
 * OpenTelemetry / Sentry / PostHog initialization for Node.
 *
 * The actual SDK packages are loaded lazily so consumers that don't need
 * telemetry don't pay the install cost. Each init function is a no-op when
 * its corresponding env var / config is absent.
 */

export interface NodeTelemetryConfig {
  serviceName: string;
  otlpEndpoint?: string;
  sentryDsn?: string;
  posthogKey?: string;
  posthogHost?: string;
  environment?: string;
}

export interface NodeTelemetryHandle {
  shutdown: () => Promise<void>;
}

export async function initNodeTelemetry(
  config: NodeTelemetryConfig,
): Promise<NodeTelemetryHandle> {
  const shutdownFns: Array<() => Promise<void>> = [];

  if (config.otlpEndpoint) {
    try {
      const { NodeSDK } = await import("@opentelemetry/sdk-node");
      const { OTLPTraceExporter } = await import(
        "@opentelemetry/exporter-trace-otlp-http"
      );
      const sdk = new NodeSDK({
        serviceName: config.serviceName,
        traceExporter: new OTLPTraceExporter({ url: `${config.otlpEndpoint}/v1/traces` }),
      });
      sdk.start();
      shutdownFns.push(() => sdk.shutdown());
    } catch (err) {
      console.warn("[telemetry] OTel SDK not installed, skipping", err);
    }
  }

  if (config.sentryDsn) {
    try {
      const Sentry = await import("@sentry/node");
      Sentry.init({ dsn: config.sentryDsn, environment: config.environment });
      shutdownFns.push(async () => {
        await Sentry.close(2000);
      });
    } catch (err) {
      console.warn("[telemetry] Sentry not installed, skipping", err);
    }
  }

  return {
    shutdown: async () => {
      for (const fn of shutdownFns) {
        try {
          await fn();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
