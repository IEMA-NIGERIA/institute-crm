import { DataTypes } from "sequelize";
import type { Migration } from "../migrator";

const ASSIGNMENT_STATUSES = ["unassigned", "assigned", "closed"];
const RESPONSE_TAGS = ["awaiting_response", "needs_response"];
const PIPELINE_STAGES = ["information_sent", "application_started", "payment_pending", "converted", "lost"];

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.addColumn("enquiries", "assignedToId", {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
    });
    await queryInterface.addColumn("enquiries", "assignmentStatus", {
        type: DataTypes.ENUM(...ASSIGNMENT_STATUSES),
        allowNull: false,
        defaultValue: "unassigned",
    });
    await queryInterface.addColumn("enquiries", "responseTag", {
        type: DataTypes.ENUM(...RESPONSE_TAGS),
        allowNull: true,
    });
    await queryInterface.addColumn("enquiries", "pipelineStage", {
        type: DataTypes.ENUM(...PIPELINE_STAGES),
        allowNull: true,
    });
    await queryInterface.addColumn("enquiries", "closingRemark", {
        type: DataTypes.TEXT,
        allowNull: true,
    });
    await queryInterface.addIndex("enquiries", ["assignedToId"]);
    await queryInterface.addIndex("enquiries", ["assignmentStatus"]);
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.removeColumn("enquiries", "closingRemark");
    await queryInterface.removeColumn("enquiries", "pipelineStage");
    await queryInterface.removeColumn("enquiries", "responseTag");
    await queryInterface.removeColumn("enquiries", "assignmentStatus");
    await queryInterface.removeColumn("enquiries", "assignedToId");
};
