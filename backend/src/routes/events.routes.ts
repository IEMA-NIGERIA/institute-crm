import { RequestHandler, Router } from "express";
import { EventsController } from "../controllers/events.controller";
import { requirePermission } from "../middleware/authorize_user";
import { PERMISSIONS } from "../domain/permissions";



export const createEventsRouter = (eventsController: EventsController, authenticate:RequestHandler):Router =>{
    const router = Router()

    router.use(authenticate)
    router.get("/", requirePermission(PERMISSIONS.EVENTS_MANAGE_REGISTRATIONS), eventsController.list)
    router.post("/", requirePermission(PERMISSIONS.EVENTS_MANAGE_REGISTRATIONS), eventsController.create)
    router.get("/:id", requirePermission(PERMISSIONS.EVENTS_MANAGE_REGISTRATIONS), eventsController.getById)

    return router
}