import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

if (!process.env.SESSION_SECRET) {
  console.warn("[app] SESSION_SECRET not set — using insecure fallback for dev/testing only");
}

const app: Express = express();

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

app.use(
  cors({
    origin: process.env.DASHBOARD_URL || true,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use("/api", router);

// In production, serve the dashboard as a static SPA
if (process.env.NODE_ENV === "production") {
  const dashboardDist = path.resolve(__dirname, "../../artifacts/dashboard/dist/public");
  if (existsSync(dashboardDist)) {
    app.use(express.static(dashboardDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(dashboardDist, "index.html"));
    });
    logger.info({ dashboardDist }, "Serving dashboard static files");
  } else {
    logger.warn({ dashboardDist }, "Dashboard dist not found — skipping static serving");
  }
}

export default app;
