import { DataTypes } from "sequelize";
import type { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("users", {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        firstName: { type: DataTypes.STRING(100), allowNull: false },
        lastName: { type: DataTypes.STRING(100), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        passwordHash: { type: DataTypes.STRING(255), allowNull: false },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        roleId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: "roles", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        lastLoginAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("users", ["roleId"]);
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("users");
};
