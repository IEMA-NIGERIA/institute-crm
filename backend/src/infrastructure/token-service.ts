import jwt from "jsonwebtoken";

export interface IssuedToken {
    token: string;
    expiresAt: Date;
}

export interface TokenService {
    /** Tokens identify the user only; roles/status are resolved per request so revocations apply immediately. */
    issue(userId: string): IssuedToken;
    /** Returns the user id, or null for any invalid, expired or tampered token. */
    verify(token: string): string | null;
}

const ALGORITHM = "HS256" as const;
const AUDIENCE = "iema-crm-api";

export class JwtTokenService implements TokenService {
    constructor(
        private readonly secret: string,
        private readonly issuer: string,
        private readonly expiresInSeconds: number,
    ) {}

    issue(userId: string): IssuedToken {
        const token = jwt.sign({}, this.secret, {
            subject: userId,
            algorithm: ALGORITHM,
            expiresIn: this.expiresInSeconds,
            issuer: this.issuer,
            audience: AUDIENCE,
        });
        return { token, expiresAt: new Date(Date.now() + this.expiresInSeconds * 1000) };
    }

    verify(token: string): string | null {
        try {
            const decoded = jwt.verify(token, this.secret, {
                algorithms: [ALGORITHM], // pin the algorithm: blocks alg=none / key-confusion attacks
                issuer: this.issuer,
                audience: AUDIENCE,
            });
            if (typeof decoded === "string" || typeof decoded.sub !== "string") {
                return null;
            }
            return decoded.sub;
        } catch {
            return null;
        }
    }
}
