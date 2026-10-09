import { SYSTEM_ADMINISTRATOR_ROLE, type Permission } from "../domain/permissions";
import type { PermissionDefinition, Role, RoleRepository } from "../domain/user";
import { ConflictError, NotFoundError } from "../errors/app-error";
import type { Logger } from "../infrastructure/logger";

export class RoleService {
    constructor(
        private readonly roles: RoleRepository,
        private readonly logger: Logger,
    ) {}

    list(): Promise<Role[]> {
        return this.roles.list();
    }

    listPermissions(): Promise<PermissionDefinition[]> {
        return this.roles.listPermissions();
    }

    async updatePermissions(roleId: string, permissions: readonly Permission[], actorId: string): Promise<Role> {
        const role = await this.roles.findById(roleId);
        if (!role) {
            throw new NotFoundError("role");
        }

        // The superuser role always holds every permission; editing it would be a silent no-op.
        if (role.title === SYSTEM_ADMINISTRATOR_ROLE) {
            throw new ConflictError(`the ${SYSTEM_ADMINISTRATOR_ROLE} role always has every permission and cannot be edited`);
        }

        const next = [...new Set(permissions)];
        const updated = await this.roles.setPermissions(roleId, next);

        const before = new Set(role.permissions);
        const after = new Set(updated.permissions);
        this.logger.info(
            {
                audit: "role.permissions.changed",
                actorId,
                roleId,
                role: role.title,
                added: updated.permissions.filter((p) => !before.has(p)),
                removed: role.permissions.filter((p) => !after.has(p)),
            },
            "role permissions changed",
        );
        return updated;
    }
}
