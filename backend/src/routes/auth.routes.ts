import { Router, type RequestHandler } from "express";
import type { AuthController } from "../controllers/auth.controller";

export const createAuthRouter = (authController: AuthController, loginRateLimiter: RequestHandler): Router => {
    const router = Router();

    router.post("/login", loginRateLimiter, authController.login);
    router.post("/logout", authController.logout);

    return router;
};
