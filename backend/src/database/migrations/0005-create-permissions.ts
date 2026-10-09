import { randomUUID } from "node:crypto";
import { DataTypes, QueryTypes } from "sequelize";
import type { Migration } from "../migrator";

// Frozen copies: migrations must not depend on application code that may change later.
const PERMISSIONS: Record<string, string> = {
    "enquiries:read": "View enquiries",
    "enquiries:write": "Capture and manage enquiries",
    "applications:read": "View membership applications",
    "applications:write": "Capture and manage membership applications",
    "applications:screen": "Screen applications for eligibility and forward them to the Committee",
    "applications:review": "Review forwarded applications and record decisions with comments",
    "persons:read": "View person records",
    "persons:write": "Maintain person records",
    "interactions:log": "Log interactions with people and organisations",
    "events:register-members": "Register members for events",
    "events:manage-registrations": "Manage event registrations",
    "communications:send": "Send communications to assigned segments",
    "certifications:manage": "Manage certification candidates",
    "training:manage": "Manage training cohorts",
    "assessments:record": "Record attendance, exam results, project report outcomes and CEUs",
    "partnerships:manage": "Manage the corporate, institutional and partner pipeline, proposals and MoUs",
    "members:issue-number": "Issue membership numbers",
    "members:approve-changes": "Approve grade upgrades, waivers and reinstatements",
    "work:reassign": "Reassign work between staff",
    "reports:view": "View dashboards and reports",
    "members:view-register-summary": "View the member register summary",
    "payments:read": "View dues and fee payment status and payment references",
    "payments:confirm-offline": "Mark offline payments as confirmed",
    "system:configure": "Full system configuration",
    "users:read": "View staff users",
    "users:manage": "Create and manage staff users",
    "roles:manage": "View the permission catalog and change role permissions",
    "integrations:manage": "Administer integrations",
    "audit-log:read": "Access the audit log",
};

const MEMBERSHIP_OFFICER = [
    "enquiries:read",
    "enquiries:write",
    "applications:read",
    "applications:write",
    "persons:read",
    "persons:write",
    "interactions:log",
    "events:register-members",
    "communications:send",
];

const ROLES: Record<string, { description: string; permissions: string[] }> = {
    "membership officer": {
        description:
            "Captures and manages enquiries and applications; maintains person records; logs interactions; registers members for events; sends communications to assigned segments.",
        permissions: MEMBERSHIP_OFFICER,
    },
    "certification & training coordinator": {
        description:
            "Manages certification candidates and training cohorts; records attendance, exam results, project report outcomes and CEUs; manages event registrations.",
        permissions: ["certifications:manage", "training:manage", "assessments:record", "events:manage-registrations", "persons:read"],
    },
    "partnership officer": {
        description:
            "Manages the corporate, institutional and partner pipeline, proposals and MoUs; logs interactions with organisations.",
        permissions: ["partnerships:manage", "interactions:log", "persons:read"],
    },
    "registrar/membership manager": {
        description:
            "All officer permissions; screens applications and forwards them to the Committee; issues membership numbers; approves grade upgrades, waivers and reinstatements; reassigns work.",
        permissions: [...MEMBERSHIP_OFFICER, "applications:screen", "members:issue-number", "members:approve-changes", "work:reassign"],
    },
    "membership committee": {
        description:
            "Reviews applications forwarded to it and records decisions (approve, reject, request more information) with comments.",
        permissions: ["applications:review"],
    },
    "management / governing council": {
        description: "Read-only access to dashboards, reports and the member register summary.",
        permissions: ["reports:view", "members:view-register-summary"],
    },
    finance: {
        description:
            "Views dues and fee payment status and payment references for reconciliation; marks offline payments as confirmed.",
        permissions: ["payments:read", "payments:confirm-offline"],
    },
    "system administrator": {
        description: "IT Admin: full system configuration, user management, integration administration and audit-log access.",
        permissions: ["system:configure", "users:read", "users:manage", "roles:manage", "integrations:manage", "audit-log:read"],
    },
};

export const up: Migration = async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;

    await queryInterface.createTable("permissions", {
        id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
        key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.STRING(255), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.createTable("role_permissions", {
        roleId: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            references: { model: "roles", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        permissionId: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            references: { model: "permissions", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex("role_permissions", ["permissionId"]);

    const now = new Date();
    const permissionIds = new Map(Object.keys(PERMISSIONS).map((key) => [key, randomUUID()]));
    await queryInterface.bulkInsert(
        "permissions",
        Object.entries(PERMISSIONS).map(([key, description]) => ({
            id: permissionIds.get(key),
            key,
            description,
            createdAt: now,
            updatedAt: now,
        })),
    );

    const roles = await sequelize.query<{ id: string; title: string }>("SELECT id, title FROM roles", {
        type: QueryTypes.SELECT,
    });
    const grants: { roleId: string; permissionId: string; createdAt: Date }[] = [];
    for (const role of roles) {
        const defaults = ROLES[role.title];
        if (!defaults) continue; // custom roles start with no permissions
        await queryInterface.bulkUpdate("roles", { description: defaults.description, updatedAt: now }, { id: role.id });
        for (const key of defaults.permissions) {
            grants.push({ roleId: role.id, permissionId: permissionIds.get(key)!, createdAt: now });
        }
    }
    if (grants.length > 0) {
        await queryInterface.bulkInsert("role_permissions", grants);
    }
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("role_permissions");
    await queryInterface.dropTable("permissions");
    await queryInterface.bulkUpdate("roles", { description: null }, {});
};
