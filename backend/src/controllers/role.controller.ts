import type { Request, Response } from "express";
import type { Role } from "../domain/user";
import { updateRolePermissionsSchema } from "../dto/role";
import { idParamSchema } from "../dto/user";
import { getPrincipal } from "../middleware/authorize_user";
import { parseInput } from "../middleware/error-handler";
import type { RoleService } from "../services/role.service";

export const toRoleResponse = (role: Role) => ({
    id: role.id,
    title: role.title,
    description: role.description,
    permissions: role.permissions,
});

export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    list = async (_req: Request, res: Response): Promise<void> => {
        const roles = await this.roleService.list();
        res.json({ roles: roles.map(toRoleResponse) });
    };

    listPermissions = async (_req: Request, res: Response): Promise<void> => {
        const permissions = await this.roleService.listPermissions();
        res.json({ permissions });
    };

    updatePermissions = async (req: Request, res: Response): Promise<void> => {
        const { id } = parseInput(idParamSchema, req.params);
        const { permissions } = parseInput(updateRolePermissionsSchema, req.body);
        const role = await this.roleService.updatePermissions(id, permissions, getPrincipal(req).userId);
        res.json({ role: toRoleResponse(role) });
    };
}
