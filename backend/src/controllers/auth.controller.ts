import type { CookieOptions, Request, Response } from "express";
import type { AppConfig } from "../config";
import { loginSchema } from "../dto/user";
import { parseInput } from "../middleware/error-handler";
import type { AuthService } from "../services/auth.service";
import { toUserResponse } from "./user.controller";

export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly cookieConfig: AppConfig["cookie"],
    ) {}

    login = async (req: Request, res: Response): Promise<void> => {
        const credentials = parseInput(loginSchema, req.body);
        const { user, accessToken } = await this.authService.authenticate(credentials);

        res.cookie(this.cookieConfig.name, accessToken.token, {
            ...this.baseCookieOptions(),
            expires: accessToken.expiresAt,
        });
        res.status(200).json({
            message: "login successful",
            user: toUserResponse(user),
            expiresAt: accessToken.expiresAt.toISOString(),
        });
    };

    logout = (_req: Request, res: Response): void => {
        // Options must match those used when setting the cookie, or browsers keep it.
        res.clearCookie(this.cookieConfig.name, this.baseCookieOptions());
        res.status(204).end();
    };

    private baseCookieOptions(): CookieOptions {
        return {
            httpOnly: true,
            secure: this.cookieConfig.secure,
            sameSite: this.cookieConfig.sameSite,
            path: "/",
            ...(this.cookieConfig.domain ? { domain: this.cookieConfig.domain } : {}),
        };
    }
}
