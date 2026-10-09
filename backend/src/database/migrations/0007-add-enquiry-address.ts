import { DataTypes } from "sequelize";
import type { Migration } from "../migrator";

const ADDRESS_COLUMNS = {
    addressLine1: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    stateProvince: { type: DataTypes.STRING(100), allowNull: true },
    postalCode: { type: DataTypes.STRING(20), allowNull: true },
    country: { type: DataTypes.STRING(100), allowNull: true },
};

export const up: Migration = async ({ context: queryInterface }) => {
    for (const [name, definition] of Object.entries(ADDRESS_COLUMNS)) {
        await queryInterface.addColumn("enquiries", name, definition);
    }
};

export const down: Migration = async ({ context: queryInterface }) => {
    for (const name of Object.keys(ADDRESS_COLUMNS)) {
        await queryInterface.removeColumn("enquiries", name);
    }
};
