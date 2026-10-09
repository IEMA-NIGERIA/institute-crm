import { type RequestHandler, Router } from "express";
import type { OrganisationController } from "../controllers/organisation.controllers";
import { PERMISSIONS } from "../domain/permissions";
import { requirePermission } from "../middleware/authorize_user";

// Organisations are part of the people/organisation records, so they share the persons permissions.
export const createOrganisationsRouter = (orgController: OrganisationController, authenticate: RequestHandler): Router => {
    const router = Router();
    const canRead = requirePermission(PERMISSIONS.PERSONS_READ);

    router.use(authenticate);
    router.get("/", canRead, orgController.list);
    router.post("/", requirePermission(PERMISSIONS.PERSONS_WRITE), orgController.create);
    // Before "/:id", or "metrics" would be parsed as an id.
    router.get("/metrics", canRead, orgController.metrics);
    router.get("/:id", canRead, orgController.getById);

    return router;
};
