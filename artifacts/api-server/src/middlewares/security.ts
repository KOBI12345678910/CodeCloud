import helmet from "helmet";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import type { Request, Response, NextFunction } from "express";

const isProduction = process.env.NODE_ENV === "production";

const productionOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];

const devOrigins: (string | RegExp)[] = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /\.replit\.dev$/,
  /\.replit\.app$/,
  /\.repl\.co$/,
];

const allowedOrigins: (string | RegExp)[] = isProduction
  ? (productionOrigins.length > 0 ? productionOrigins : [])
  : devOrigins;

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((pattern) =>
      typeof pattern === "string" ? pattern === origin : pattern.test(origin)
    );
    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
    "X-Request-ID",
    "X-API-Key",
  ],
  exposedHeaders: ["X-Request-ID", "X-Response-Time", "X-RateLimit-Remaining"],
  maxAge: 86400,
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://clerk.com", "https://*.clerk.accounts.dev"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameSrc: ["'self'", "https://clerk.com", "https://*.clerk.accounts.dev"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = (req.headers["x-request-id"] as string) || uuidv4();
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-ID", id);
  next();
};

export const responseTime = (_req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();
  res.on("close", () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    (res as unknown as Record<string, string>)._responseTime = `${ms.toFixed(2)}ms`;
  });
  next();
};

export const noSniff = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  next();
};

export function validateRequiredSecrets(): void {
  const required = [
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    if (isProduction) {
      console.error(`[FATAL] Missing required secrets: ${missing.join(", ")}. Server cannot start in production without these.`);
      process.exit(1);
    } else {
      console.warn(`[WARN] Missing secrets: ${missing.join(", ")}. JWT auth endpoints will be unavailable.`);
    }
  }

  if (!process.env.SECRETS_ENCRYPTION_KEY) {
    if (isProduction) {
      console.error("[FATAL] SECRETS_ENCRYPTION_KEY is not set. Cannot encrypt secrets in production.");
      process.exit(1);
    } else {
      console.warn("[WARN] SECRETS_ENCRYPTION_KEY not set. Using development fallback.");
    }
  }
}
