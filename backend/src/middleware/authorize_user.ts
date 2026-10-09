import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Permission } from "../domain/permissions";
import type { AuthPrincipal } from "../domain/user";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error";
import type { AuthService } from "../services/auth.service";

const BEARER_PREFIX = /^Bearer\s+(.+)$/i;

const extractToken = (req: Request, cookieName: string): string | null => {
    const fromCookie: unknown = req.cookies?.[cookieName];
    if (typeof fromCookie === "string" && fromCookie.length > 0) {
        return fromCookie;
    }
    const match = BEARER_PREFIX.exec(req.get("authorization") ?? "");
    return match?.[1]?.trim() || null;
};

/** Accepts the session cookie (browser) or an `Authorization: Bearer` header (API clients). */
export const authenticate = (authService: AuthService, cookieName: string): RequestHandler =>
    async (req: Request, _res: Response, next: NextFunction) => {
        const token = extractToken(req, cookieName);
        if (!token) {
            throw new UnauthorizedError();
        }
        req.principal = await authService.resolvePrincipal(token);
        next();
    };

export const hasPermission = (principal: AuthPrincipal, permission: Permission): boolean =>
    principal.permissions.has(permission);

/** Caller must hold every listed permission. Must run after `authenticate`. */
export const requirePermission = (...required: [Permission, ...Permission[]]): RequestHandler =>
    (req: Request, _res: Response, next: NextFunction) => {
        const principal = getPrincipal(req);
        if (!required.every((permission) => hasPermission(principal, permission))) {
            throw new ForbiddenError();
        }
        next();
    };

/** Caller must hold at least one of the listed permissions. Must run after `authenticate`. */
export const requireAnyPermission = (...allowed: [Permission, ...Permission[]]): RequestHandler =>
    (req: Request, _res: Response, next: NextFunction) => {
        const principal = getPrincipal(req);
        if (!allowed.some((permission) => hasPermission(principal, permission))) {
            throw new ForbiddenError();
        }
        next();
    };

export const getPrincipal = (req: Request): AuthPrincipal => {
    if (!req.principal) {
        // Programming error: route registered without the authenticate middleware.
        throw new UnauthorizedError();
    }
    return req.principal;
};
