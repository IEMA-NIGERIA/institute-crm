import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Container } from "./bootstrap";
import type { AppConfig } from "./config";
import type { Logger } from "./infrastructure/logger";
import { authenticate } from "./middleware/authorize_user";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { createApiRouter } from "./routes/routes";

export interface AppDependencies {
    config: AppConfig;
    logger: Logger;
    container: Container;
    /** Readiness: dependencies (DB, ...) reachable and not shutting down. */
    isReady: () => Promise<boolean>;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export const createApp = ({ config, logger, container, isReady }: AppDependencies): Express => {
    const app = express();

    app.set("trust proxy", config.trustProxyHops);
    app.disable("x-powered-by");

    app.use(
        pinoHttp({
            logger,
            // Propagate an upstream request id (load balancer / gateway) when well-formed.
            genReqId: (req, res) => {
                const incoming = req.headers["x-request-id"];
                const id = typeof incoming === "string" && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
                res.setHeader("X-Request-Id", id);
                return id;
            },
            customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
            autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/ready" },
        }),
    );

    app.use(helmet());
    app.use(
        cors({
            origin: (origin, callback) => {
                // Requests without an Origin (curl, server-to-server, health checks) aren't subject to CORS.
                // Disallowed origins get no CORS headers (browser blocks) rather than a 500.
                callback(null, !origin || config.corsOrigins.includes(origin));
            },
            credentials: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
            exposedHeaders: ["X-Request-Id"],
            maxAge: 600,
        }),
    );

    // JSON only, on purpose: browsers can't send application/json cross-site without a CORS
    // preflight, which is part of our CSRF defence for cookie-authenticated requests.
    app.use(express.json({ limit: "100kb" }));
    app.use(cookieParser());

    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });
    app.get("/ready", async (_req, res) => {
        const ready = await isReady();
        res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
    });

    const loginRateLimiter = rateLimit({
        windowMs: config.auth.loginRateLimit.windowMs,
        limit: config.auth.loginRateLimit.max,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        // Successful logins don't count against the caller.
        skipSuccessfulRequests: true,
        handler: (_req, res, _next, options) => {
            res.status(options.statusCode).json({
                message: "too many login attempts, please try again later",
                code: "RATE_LIMITED",
            });
        },
    });

    app.use(
        "/api/v1",
        createApiRouter({
            controllers: container.controllers,
            authenticate: authenticate(container.services.auth, config.cookie.name),
            loginRateLimiter,
        }),
    );

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};
