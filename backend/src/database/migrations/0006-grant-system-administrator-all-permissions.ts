import { QueryTypes } from "sequelize";
import type { Migration } from "../migrator";

// The application treats "system administrator" as a superuser regardless of stored grants.
// This keeps the stored data in line with that behaviour (reports, direct SQL, audits).
const ROLE_TITLE = "system administrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (roleId, permissionId, createdAt)
         SELECT r.id, p.id, :now
         FROM roles r CROSS JOIN permissions p
         WHERE r.title = :title
           AND NOT EXISTS (
               SELECT 1 FROM role_permissions rp WHERE rp.roleId = r.id AND rp.permissionId = p.id
           )`,
        { replacements: { title: ROLE_TITLE, now: new Date() }, type: QueryTypes.INSERT },
    );
};

// Restores the grants seeded by 0005.
const ORIGINAL_GRANTS = ["system:configure", "users:read", "users:manage", "roles:manage", "integrations:manage", "audit-log:read"];

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `DELETE rp FROM role_permissions rp
         JOIN roles r ON r.id = rp.roleId
         JOIN permissions p ON p.id = rp.permissionId
         WHERE r.title = :title AND p.\`key\` NOT IN (:keep)`,
        { replacements: { title: ROLE_TITLE, keep: ORIGINAL_GRANTS } },
    );
};
