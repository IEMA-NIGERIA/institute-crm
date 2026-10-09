import type { IUserLogin } from "../dto/user";
import type { AuthPrincipal, User, UserRepository } from "../domain/user";
import { InvalidCredentialsError, UnauthorizedError } from "../errors/app-error";
import type { PasswordHasher } from "../infrastructure/password-hasher";
import type { IssuedToken, TokenService } from "../infrastructure/token-service";

export interface AuthResult {
    user: User;
    accessToken: IssuedToken;
}

export class AuthService {
    // Verified against when the email is unknown, so response time does not reveal
    // whether an account exists (prevents timing-based user enumeration).
    private dummyHash: Promise<string> | undefined;

    constructor(
        private readonly users: UserRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly tokens: TokenService,
        private readonly clock: () => Date = () => new Date(),
    ) {}

    async authenticate(credentials: IUserLogin): Promise<AuthResult> {
        const record = await this.users.findCredentialsByEmail(credentials.email);
        if (!record) {
            await this.passwordHasher.verify(credentials.password, await this.getDummyHash());
            throw new InvalidCredentialsError();
        }

        const passwordMatches = await this.passwordHasher.verify(credentials.password, record.passwordHash);
        // Same error for wrong password and disabled account: don't leak account state.
        if (!passwordMatches || !record.user.isActive) {
            throw new InvalidCredentialsError();
        }

        await this.users.recordLogin(record.user.id, this.clock());
        return { user: record.user, accessToken: this.tokens.issue(record.user.id) };
    }

    /** Resolves a bearer/cookie token into the current principal, re-checking the account on every call. */
    async resolvePrincipal(token: string): Promise<AuthPrincipal> {
        const userId = this.tokens.verify(token);
        if (!userId) {
            throw new UnauthorizedError();
        }
        const user = await this.users.findById(userId);
        if (!user || !user.isActive) {
            throw new UnauthorizedError();
        }
        return {
            userId: user.id,
            role: user.role?.title ?? null,
            permissions: new Set(user.role?.permissions ?? []),
        };
    }

    private getDummyHash(): Promise<string> {
        this.dummyHash ??= this.passwordHasher.hash("timing-equalisation-placeholder");
        return this.dummyHash;
    }
}
