import express, { type Express } from "express";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import stripeWebhookRouter from "./routes/stripe-webhook";
import { logger } from "./lib/logger";
import { corsMiddleware, helmetMiddleware, requestId, responseTime, noSniff } from "./middlewares/security";
import { requestLogger } from "./middlewares/logging";
import { generalLimiter } from "./middlewares/rateLimit";
import { i18nMiddleware } from "./middlewares/i18n";

const app: Express = express();

app.use(requestId);
app.use(requestLogger);
app.use(responseTime);
app.use(helmetMiddleware);
app.use(noSniff);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(corsMiddleware);

// Stripe webhook MUST be mounted BEFORE express.json() so the route can read
// the raw body for stripe.webhooks.constructEvent signature verification.
// The route uses express.raw({ type: "application/json" }) internally.
app.use("/api", stripeWebhookRouter);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);
app.use(i18nMiddleware);

app.use(clerkMiddleware());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api", (_req, res) => {
  res.json({
    name: "CodeCloud API",
    version: "1.0.0",
    status: "ok",
    docs: "/api-docs",
  });
});

app.get("/api/users", (_req, res) => {
  res.json({
    users: [],
    total: 0,
    note: "Authenticated endpoint stub - sign in to list real users.",
  });
});

app.use("/api", router);

export default app;
