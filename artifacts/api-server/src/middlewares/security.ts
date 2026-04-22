import helmet from "helmet";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import type { Request, Response, NextFunction } from "express";

const allowedOrigins = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /\.replit\.dev$/,
  /\.replit\.app$/,
  /\.repl\.co$/,
];

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
  next();
};
