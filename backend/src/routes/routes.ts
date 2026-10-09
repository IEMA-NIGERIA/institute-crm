import { Router, type RequestHandler } from "express";
import type { Controllers } from "../bootstrap";
import { createApplicationRouter } from "./application.routes";
import { createAuthRouter } from "./auth.routes";
import { PERMISSIONS } from "../domain/permissions";
import { requirePermission } from "../middleware/authorize_user";
import { createEnquiryRouter } from "./enquiry.routes";
import { createRoleRouter } from "./role.routes";
import { createUserRouter } from "./user.routes";
import { createOrganisationsRouter } from "./organisations.routes";
import { createProfilesRouter } from "./profiles.routes";
import { createEventsRouter } from "./events.routes";

export interface RouterDependencies {
    controllers: Controllers;
    authenticate: RequestHandler;
    loginRateLimiter: RequestHandler;
}

export const createApiRouter = ({ controllers, authenticate, loginRateLimiter }: RouterDependencies): Router => {
    const router = Router();

    router.use("/auth", createAuthRouter(controllers.auth, loginRateLimiter));
    router.use("/users", createUserRouter(controllers.user, authenticate));
    router.use("/roles", createRoleRouter(controllers.role, authenticate));
    router.get(
        "/permissions",
        authenticate,
        requirePermission(PERMISSIONS.ROLES_MANAGE),
        controllers.role.listPermissions,
    );
    router.use("/enquiries", createEnquiryRouter(controllers.enquiry, authenticate));
    router.use("/applications", createApplicationRouter(controllers.application, authenticate));

    router.use("/organisations", createOrganisationsRouter(controllers.organisation, authenticate));
    router.use("/profiles", createProfilesRouter(controllers.profiles, authenticate))
    router.use("/events", createEventsRouter(controllers.events, authenticate))
    return router;
};
