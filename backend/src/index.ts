import type { Server } from "node:http";
import { createApp } from "./app";
import { createContainer, createDatabaseHealthCheck, createInfrastructure } from "./bootstrap";
import { config } from "./config";
import { logger } from "./infrastructure/logger";
import { createSequelize } from "./models";

const SHUTDOWN_TIMEOUT_MS = 10_000;

const main = async (): Promise<void> => {
    const sequelize = createSequelize(config.database, logger);
    await sequelize.authenticate();
    logger.info("database connection established");

    const container = createContainer(config, createInfrastructure(config), logger);
    const isDatabaseHealthy = createDatabaseHealthCheck(sequelize);

    let shuttingDown = false;
    const app = createApp({
        config,
        logger,
        container,
        isReady: async () => !shuttingDown && (await isDatabaseHealthy()),
    });

    const server: Server = app.listen(config.port);
    await new Promise<void>((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    logger.info({ port: config.port, env: config.env }, "server listening");

    const shutdown = async (signal: string): Promise<void> => {
        if (shuttingDown) return;
        shuttingDown = true;
        logger.info({ signal }, "shutting down");

        // Hard deadline so a stuck connection can't block a deploy forever.
        const forceExit = setTimeout(() => {
            logger.error("graceful shutdown timed out, forcing exit");
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);
        forceExit.unref();

        try {
            // Stop accepting connections, let in-flight requests finish, then drop idle keep-alives.
            const closed = new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
            server.closeIdleConnections();
            await closed;
            await sequelize.close();
            logger.info("shutdown complete");
            process.exit(0);
        } catch (err) {
            logger.error({ err }, "error during shutdown");
            process.exit(1);
        }
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
};

process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "unhandled promise rejection");
    process.exit(1);
});
process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception");
    process.exit(1);
});

main().catch((err: unknown) => {
    logger.fatal({ err }, "failed to start server");
    process.exit(1);
});
