import type { QueryInterface, Sequelize } from "sequelize";
import { SequelizeStorage, Umzug, type MigrationFn } from "umzug";
import type { Logger } from "../infrastructure/logger";
import * as m0001 from "./migrations/0001-create-roles";
import * as m0002 from "./migrations/0002-create-users";
import * as m0003 from "./migrations/0003-create-profiles-and-members";
import * as m0004 from "./migrations/0004-create-enquiries";
import * as m0005 from "./migrations/0005-create-permissions";
import * as m0006 from "./migrations/0006-grant-system-administrator-all-permissions";
import * as m0007 from "./migrations/0007-add-enquiry-address";
import * as m0008 from "./migrations/0008-create-applications";
import * as m0009 from "./migrations/0009-create-organisations";
import * as m0010 from "./migrations/0010-enhance-enquiries";

export type Migration = MigrationFn<QueryInterface>;

// Explicit, ordered list: works identically under tsx and compiled dist/, no globbing.
// Never edit or reorder an applied migration; append a new one instead.
const MIGRATIONS = [
    { name: "0001-create-roles", module: m0001 },
    { name: "0002-create-users", module: m0002 },
    { name: "0003-create-profiles-and-members", module: m0003 },
    { name: "0004-create-enquiries", module: m0004 },
    { name: "0005-create-permissions", module: m0005 },
    { name: "0006-grant-system-administrator-all-permissions", module: m0006 },
    { name: "0007-add-enquiry-address", module: m0007 },
    { name: "0008-create-applications", module: m0008 },
    { name: "0009-create-organisations", module: m0009 },
    { name: "0010-enhance-enquiries", module: m0010 },
];

export const createMigrator = (sequelize: Sequelize, logger: Logger) =>
    new Umzug({
        migrations: MIGRATIONS.map(({ name, module }) => ({ name, up: module.up, down: module.down })),
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize, tableName: "schema_migrations" }),
        logger: {
            info: (msg) => logger.info(msg, "migration"),
            warn: (msg) => logger.warn(msg, "migration"),
            error: (msg) => logger.error(msg, "migration"),
            debug: (msg) => logger.debug(msg, "migration"),
        },
    });
