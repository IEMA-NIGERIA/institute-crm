import { type RequestHandler, Router } from "express"
import { requirePermission } from "../middleware/authorize_user"
import { PERMISSIONS } from "../domain/permissions"
import { ProfileController } from "../controllers/profile.controller"


export const createProfilesRouter = (profileController:ProfileController, authenticate: RequestHandler): Router=>{
    const router = Router()

    router.use(authenticate)

    router.get("/", requirePermission(PERMISSIONS.PERSONS_READ), profileController.list)
    router.post("/", requirePermission(PERMISSIONS.PERSONS_WRITE), profileController.create)
    router.get("/:id", requirePermission(PERMISSIONS.PERSONS_READ), profileController.getById)

    return router;
}