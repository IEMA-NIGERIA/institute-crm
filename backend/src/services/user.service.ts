import type { Page } from "../domain/pagination";
import type { RoleRepository, User, UserListFilter, UserRepository } from "../domain/user";
import type { IAdminCreateUser, IListUsers } from "../dto/user";
import { ConflictError, NotFoundError, ValidationError } from "../errors/app-error";
import type { PasswordHasher } from "../infrastructure/password-hasher";

const SIGNED_IN_WINDOW_DAYS = 30;

export interface UserMetricsSummary {
    total: number;
    active: number;
    inactive: number;
    /** Active users who signed in during the last 30 days. */
    signedInLast30Days: number;
}

export class UserService {
    constructor(
        private readonly users: UserRepository,
        private readonly roles: RoleRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly clock: () => Date = () => new Date(),
    ) {}

    list({ search, role, status, page, pageSize }: IListUsers): Promise<Page<User>> {
        const filter: UserListFilter = {};
        if (search) filter.search = search;
        if (role) filter.roleTitle = role;
        if (status) filter.isActive = status === "active";
        return this.users.list(filter, { limit: pageSize, offset: (page - 1) * pageSize });
    }

    async metrics(): Promise<UserMetricsSummary> {
        const since = new Date(this.clock().getTime() - SIGNED_IN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        const { total, active, inactive, signedInSince } = await this.users.metrics(since);
        return { total, active, inactive, signedInLast30Days: signedInSince };
    }

    async getById(userId: string): Promise<User> {
        const user = await this.users.findById(userId);
        if (!user) {
            throw new NotFoundError("user");
        }
        return user;
    }

    async create(input: IAdminCreateUser): Promise<User> {
        // Normalise here too: the service must not rely on every caller having gone through the HTTP schema.
        const email = input.email.trim().toLowerCase();
        if (await this.users.existsByEmail(email)) {
            throw new ConflictError("a user with this email already exists");
        }

        let roleId: string | null = null;
        if (input.roleTitle) {
            const role = await this.roles.findByTitle(input.roleTitle);
            if (!role) {
                throw new ValidationError([{ path: "roleTitle", message: `unknown role "${input.roleTitle}"` }]);
            }
            roleId = role.id;
        }

        return this.users.create({
            firstName: input.firstName,
            lastName: input.lastName,
            email,
            passwordHash: await this.passwordHasher.hash(input.password),
            roleId,
        });
    }
}
