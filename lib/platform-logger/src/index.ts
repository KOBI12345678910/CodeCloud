import { pino, type Logger, type LoggerOptions } from "pino";

export const REDACTION_PATHS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "*.password",
  "*.token",
  "*.secret",
  "*.apiKey",
  "*.api_key",
  "*.authorization",
  "*.cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
];

export interface CreateLoggerOptions extends LoggerOptions {
  service?: string;
  env?: string;
}

export function createLogger(opts: CreateLoggerOptions = {}): Logger {
  const { service, env, redact, ...rest } = opts;
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    base: { service, env: env ?? process.env.NODE_ENV ?? "development" },
    redact: {
      paths: [...REDACTION_PATHS, ...(redact ? (Array.isArray(redact) ? redact : redact.paths) : [])],
      censor: "[REDACTED]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    ...rest,
  });
}

export type { Logger };
