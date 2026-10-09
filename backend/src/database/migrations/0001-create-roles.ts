import { randomUUID } from "node:crypto";
import { DataTypes } from "sequelize";
import type { Migration } from "../migrator";

// Frozen copy: migrations must not depend on application code that may change later.
const DEFAULT_ROLES = [
    "membership officer",
    "certification & training coordinator",
    "partnership officer",
    "registrar/membership manager",
    "membership committee",
    "management / governing council",
    "finance",
    "system administrator",
];

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("roles", {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        title: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.STRING(255), allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    const now = new Date();
    await queryInterface.bulkInsert(
        "roles",
        DEFAULT_ROLES.map((title) => ({ id: randomUUID(), title, description: null, createdAt: now, updatedAt: now })),
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("roles");
};
