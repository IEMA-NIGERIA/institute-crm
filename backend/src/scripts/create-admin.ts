import { parseArgs } from "node:util";
import { createContainer, createInfrastructure } from "../bootstrap";
import { config } from "../config";
import { createUserSchema } from "../dto/user";
import { logger } from "../infrastructure/logger";
import { createSequelize } from "../models";
import { SYSTEM_ADMINISTRATOR_ROLE } from "../models/roles.model";

// Usage: ADMIN_PASSWORD='...' yarn create-admin --email a@b.org --first-name Ada --last-name Obi
// The password is read from the environment so it never appears in shell history or `ps`.
const run = async (): Promise<void> => {
    const { values } = parseArgs({
        options: {
            email: { type: "string" },
            "first-name": { type: "string" },
            "last-name": { type: "string" },
        },
    });

    const parsed = createUserSchema.safeParse({
        email: values.email,
        firstName: values["first-name"],
        lastName: values["last-name"],
        password: process.env["ADMIN_PASSWORD"],
        roleTitle: SYSTEM_ADMINISTRATOR_ROLE,
    });
    if (!parsed.success) {
        throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }

    const sequelize = createSequelize(config.database, logger);
    try {
        const { services } = createContainer(config, createInfrastructure(config), logger);
        const user = await services.user.create(parsed.data);
        logger.info({ userId: user.id, email: user.email }, "system administrator created");
    } finally {
        await sequelize.close();
    }
};

run().catch((err: unknown) => {
    logger.fatal({ err }, "failed to create admin");
    process.exitCode = 1;
});
