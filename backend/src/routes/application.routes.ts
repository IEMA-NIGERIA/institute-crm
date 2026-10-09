import { Router, type RequestHandler } from "express";
import type { ApplicationController } from "../controllers/application.controller";
import { PERMISSIONS } from "../domain/permissions";
import { requireAnyPermission } from "../middleware/authorize_user";

export const createApplicationRouter = (applicationController: ApplicationController, authenticate: RequestHandler): Router => {
    const router = Router();
    // Staff read applications; the Membership Committee reviews them (scoped in the service).
    const canView = requireAnyPermission(PERMISSIONS.APPLICATIONS_READ, PERMISSIONS.APPLICATIONS_REVIEW);

    router.use(authenticate);
    router.get("/", canView, applicationController.list);
    router.get("/metrics", canView, applicationController.metrics);

    return router;
};
