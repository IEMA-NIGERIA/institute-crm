import { config } from "../config";
import { createMigrator } from "../database/migrator";
import { logger } from "../infrastructure/logger";
import { createSequelize } from "../models";

// Usage: migrate [up|down|status]   (down reverts exactly one migration)
const run = async (): Promise<void> => {
    const command = process.argv[2] ?? "up";
    const sequelize = createSequelize(config.database, logger);
    const migrator = createMigrator(sequelize, logger);

    try {
        switch (command) {
            case "up": {
                const applied = await migrator.up();
                logger.info({ applied: applied.map((m) => m.name) }, "migrations applied");
                break;
            }
            case "down": {
                const reverted = await migrator.down();
                logger.info({ reverted: reverted.map((m) => m.name) }, "migration reverted");
                break;
            }
            case "status": {
                const [executed, pending] = await Promise.all([migrator.executed(), migrator.pending()]);
                logger.info({ executed: executed.map((m) => m.name), pending: pending.map((m) => m.name) }, "migration status");
                break;
            }
            default:
                throw new Error(`unknown command "${command}" (expected up | down | status)`);
        }
    } finally {
        await sequelize.close();
    }
};

run().catch((err: unknown) => {
    logger.fatal({ err }, "migration failed");
    process.exitCode = 1;
});
