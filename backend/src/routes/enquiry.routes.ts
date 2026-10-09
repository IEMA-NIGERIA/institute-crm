import { Router, type RequestHandler } from "express";
import type { EnquiryController } from "../controllers/enquiry.controller";
import { PERMISSIONS } from "../domain/permissions";
import { requirePermission } from "../middleware/authorize_user";

export const createEnquiryRouter = (enquiryController: EnquiryController, authenticate: RequestHandler): Router => {
    const router = Router();

    router.use(authenticate);
    router.get("/", requirePermission(PERMISSIONS.ENQUIRIES_READ), enquiryController.list);
    router.get("/metrics", requirePermission(PERMISSIONS.ENQUIRIES_READ), enquiryController.metrics);
    router.post("/", requirePermission(PERMISSIONS.ENQUIRIES_WRITE), enquiryController.create);
    router.get("/:id", requirePermission(PERMISSIONS.ENQUIRIES_READ), enquiryController.getById);
    router.patch("/:id", requirePermission(PERMISSIONS.ENQUIRIES_WRITE), enquiryController.update);

    return router;
};
