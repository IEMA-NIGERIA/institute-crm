import { DataTypes } from "sequelize";
import type { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("profiles", {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        title: { type: DataTypes.STRING(20), allowNull: true },
        firstName: { type: DataTypes.STRING(100), allowNull: false },
        lastName: { type: DataTypes.STRING(100), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        mobile: { type: DataTypes.STRING(30), allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable("members", {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        profileId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            references: { model: "profiles", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        grade: { type: DataTypes.STRING(50), allowNull: false },
        membershipNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        status: { type: DataTypes.STRING(30), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("members");
    await queryInterface.dropTable("profiles");
};
