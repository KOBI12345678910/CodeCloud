import express, { type Express } from "express";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { corsMiddleware, helmetMiddleware, requestId, responseTime, noSniff } from "./middlewares/security";
import { requestLogger } from "./middlewares/logging";
import { generalLimiter } from "./middlewares/rateLimit";

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
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.use(clerkMiddleware());

app.use("/api", router);

export default app;
