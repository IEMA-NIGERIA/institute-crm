import { Router, type RequestHandler } from "express";
import type { UserController } from "../controllers/user.controller";
import { PERMISSIONS } from "../domain/permissions";
import { requirePermission } from "../middleware/authorize_user";

export const createUserRouter = (userController: UserController, authenticate: RequestHandler): Router => {
    const router = Router();

    router.use(authenticate);
    router.get("/me", userController.me);
    router.get("/", requirePermission(PERMISSIONS.USERS_READ), userController.list);
    // Before "/:id", or "metrics" would be parsed as an id.
    router.get("/metrics", requirePermission(PERMISSIONS.USERS_READ), userController.metrics);
    router.post("/", requirePermission(PERMISSIONS.USERS_MANAGE), userController.create);
    router.get("/:id", requirePermission(PERMISSIONS.USERS_READ), userController.getById);

    return router;
};
