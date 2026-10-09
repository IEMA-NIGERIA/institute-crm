import { Router, type RequestHandler } from "express";
import type { RoleController } from "../controllers/role.controller";
import { PERMISSIONS } from "../domain/permissions";
import { requirePermission } from "../middleware/authorize_user";

export const createRoleRouter = (roleController: RoleController, authenticate: RequestHandler): Router => {
    const router = Router();

    router.use(authenticate);
    router.get("/", roleController.list);
    router.put("/:id/permissions", requirePermission(PERMISSIONS.ROLES_MANAGE), roleController.updatePermissions);

    return router;
};
