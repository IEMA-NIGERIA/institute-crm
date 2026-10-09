import { DataTypes } from "sequelize";
import { ENQUIRER_TYPES, ENQUIRY_SOURCES, INTEREST_TYPES } from "../../domain/enquiry";
import type { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("enquiries", {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        enquirerType: { type: DataTypes.ENUM(...ENQUIRER_TYPES), allowNull: false },
        name: { type: DataTypes.STRING(200), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: true },
        phone: { type: DataTypes.STRING(30), allowNull: true },
        employer: { type: DataTypes.STRING(200), allowNull: true },
        sector: { type: DataTypes.STRING(100), allowNull: true },
        interestType: { type: DataTypes.ENUM(...INTEREST_TYPES), allowNull: false },
        source: { type: DataTypes.ENUM(...ENQUIRY_SOURCES), allowNull: false },
        estimatedValue: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
        createdById: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("enquiries", ["createdById"]);
    await queryInterface.addIndex("enquiries", ["email"]);
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("enquiries");
};
