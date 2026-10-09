import pino from "pino";
import { config } from "../config";

export const logger = pino({
    name: config.appName,
    level: config.env === "test" ? "silent" : config.logLevel,
    // Defence in depth: never let credentials reach the logs.
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'res.headers["set-cookie"]',
            "*.password",
            "*.passwordHash",
        ],
        censor: "[REDACTED]",
    },
    // Structured JSON everywhere except local development (pino-pretty is a dev dependency).
    ...(config.env === "development"
        ? { transport: { target: "pino-pretty", options: { colorize: true } } }
        : {}),
});

export type Logger = typeof logger;
