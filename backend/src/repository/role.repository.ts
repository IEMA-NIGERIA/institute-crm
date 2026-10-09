import type { IncludeOptions } from "sequelize";
import { effectivePermissions, isPermission, type Permission } from "../domain/permissions";
import type { PermissionDefinition, Role, RoleRepository } from "../domain/user";
import { NotFoundError } from "../errors/app-error";
import { PermissionModel, RoleModel, RolePermissionModel } from "../models";

export const PERMISSIONS_INCLUDE: IncludeOptions = {
    model: PermissionModel,
    as: "permissions",
    attributes: ["key"],
    through: { attributes: [] },
};

// Keys present in the DB but unknown to this build (e.g. during a rolling deploy) are ignored.
const toPermissionKeys = (models: PermissionModel[] | undefined): Permission[] =>
    (models ?? []).map((p) => p.key).filter(isPermission).sort();

export const toRole = (model: RoleModel): Role => ({
    id: model.id,
    title: model.title,
    description: model.description,
    permissions: effectivePermissions(model.title, toPermissionKeys(model.permissions)),
});

export class SequelizeRoleRepository implements RoleRepository {
    async list(): Promise<Role[]> {
        const roles = await RoleModel.findAll({ include: [PERMISSIONS_INCLUDE], order: [["title", "ASC"]] });
        return roles.map(toRole);
    }

    async findById(id: string): Promise<Role | null> {
        const model = await RoleModel.findByPk(id, { include: [PERMISSIONS_INCLUDE] });
        return model ? toRole(model) : null;
    }

    async findByTitle(title: string): Promise<Role | null> {
        const model = await RoleModel.findOne({ where: { title }, include: [PERMISSIONS_INCLUDE] });
        return model ? toRole(model) : null;
    }

    async setPermissions(roleId: string, permissions: readonly Permission[]): Promise<Role> {
        const sequelize = RoleModel.sequelize!;
        await sequelize.transaction(async (transaction) => {
            // Lock the role row so concurrent edits to the same role serialise.
            const role = await RoleModel.findByPk(roleId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!role) {
                throw new NotFoundError("role");
            }
            const catalog = await PermissionModel.findAll({ where: { key: [...permissions] }, transaction });
            if (catalog.length !== new Set(permissions).size) {
                const known = new Set(catalog.map((p) => p.key));
                const missing = permissions.filter((p) => !known.has(p));
                throw new Error(`permissions missing from database catalog: ${missing.join(", ")} (migration not applied?)`);
            }
            await RolePermissionModel.destroy({ where: { roleId }, transaction });
            await RolePermissionModel.bulkCreate(
                catalog.map((p) => ({ roleId, permissionId: p.id })),
                { transaction },
            );
        });
        const updated = await this.findById(roleId);
        if (!updated) {
            throw new NotFoundError("role");
        }
        return updated;
    }

    async listPermissions(): Promise<PermissionDefinition[]> {
        const rows = await PermissionModel.findAll({ order: [["key", "ASC"]] });
        return rows.flatMap((row) => (isPermission(row.key) ? [{ key: row.key, description: row.description }] : []));
    }
}
