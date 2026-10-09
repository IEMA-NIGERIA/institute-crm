import type { AuthPrincipal } from "../domain/user";

declare global {
    namespace Express {
        interface Request {
            /** Set by the authenticate middleware. */
            principal?: AuthPrincipal;
        }
    }
}

export {};
