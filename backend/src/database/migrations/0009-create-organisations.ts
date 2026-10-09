import { DataTypes } from "sequelize";
import type { Migration } from "../migrator";

// Frozen copies: migrations must not depend on application code that may change later.
const TYPES = ["corporate_member", "institutional_member", "partner", "employer"];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable("organisations", {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        name: { type: DataTypes.STRING(200), allowNull: false },
        // Normalised name / registration reference. The unique indexes are what actually
        // prevent duplicate organisations, including under concurrent requests.
        nameKey: { type: DataTypes.STRING(200), allowNull: false },
        registrationReference: { type: DataTypes.STRING(50), allowNull: true },
        registrationKey: { type: DataTypes.STRING(50), allowNull: true },
        email: { type: DataTypes.STRING(255), allowNull: true },
        phone: { type: DataTypes.STRING(20), allowNull: true },
        sector: { type: DataTypes.STRING(100), allowNull: true },
        size: { type: DataTypes.ENUM(...SIZES), allowNull: true },
        website: { type: DataTypes.STRING(255), allowNull: true },
        addressLine1: { type: DataTypes.STRING(255), allowNull: true },
        city: { type: DataTypes.STRING(100), allowNull: true },
        stateProvince: { type: DataTypes.STRING(100), allowNull: true },
        postalCode: { type: DataTypes.STRING(20), allowNull: true },
        country: { type: DataTypes.STRING(100), allowNull: true },
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
    await queryInterface.addIndex("organisations", ["nameKey"], { unique: true, name: "organisations_name_key_unique" });
    // MySQL allows many NULLs in a unique index, so organisations without a reference don't clash.
    await queryInterface.addIndex("organisations", ["registrationKey"], {
        unique: true,
        name: "organisations_registration_key_unique",
    });
    await queryInterface.addIndex("organisations", ["sector"]);
    await queryInterface.addIndex("organisations", ["size"]);

    // An organisation can be several things at once (e.g. a corporate member that is also a partner).
    await queryInterface.createTable("organisation_types", {
        organisationId: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            references: { model: "organisations", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        type: { type: DataTypes.ENUM(...TYPES), allowNull: false, primaryKey: true },
    });
    await queryInterface.addIndex("organisation_types", ["type"]);
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("organisation_types");
    await queryInterface.dropTable("organisations");
};
