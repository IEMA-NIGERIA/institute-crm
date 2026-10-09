import { DataTypes } from "sequelize";
import type { Migration } from "../migrator";

// Frozen copies: migrations must not depend on application code that may change later.
const GRADES = ["student", "graduate", "associate", "full", "fellow"];
const STATUSES = ["submitted", "screening", "info_requested", "with_committee", "approved", "rejected"];

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("applications", {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        reference: { type: DataTypes.STRING(30), allowNull: false, unique: true },
        profileId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: "profiles", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        grade: { type: DataTypes.ENUM(...GRADES), allowNull: false },
        status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: "submitted" },
        submittedAt: { type: DataTypes.DATE, allowNull: false },
        decidedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("applications", ["profileId"]);
    // Default list order and the status filter / metrics.
    await queryInterface.addIndex("applications", ["submittedAt"]);
    await queryInterface.addIndex("applications", ["status"]);
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("applications");
};
