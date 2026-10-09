import { col, fn, Op, UniqueConstraintError, where, type IncludeOptions, type WhereOptions } from "sequelize";
import type { Page, PageRequest } from "../domain/pagination";
import type {
    CreateUserInput,
    User,
    UserCredentials,
    UserListFilter,
    UserMetrics,
    UserRepository,
} from "../domain/user";
import { ConflictError } from "../errors/app-error";
import { RoleModel, UserModel } from "../models";
import { PERMISSIONS_INCLUDE, toRole } from "./role.repository";
import { escapeLike } from "./sql";

// Role + its permissions in the same query: the per-request principal lookup stays one round trip.
const ROLE_INCLUDE: IncludeOptions = { model: RoleModel, as: "role", include: [PERMISSIONS_INCLUDE] };

const toUser = (model: UserModel): User => ({
    id: model.id,
    firstName: model.firstName,
    lastName: model.lastName,
    email: model.email,
    isActive: model.isActive,
    role: model.role ? toRole(model.role) : null,
    lastLoginAt: model.lastLoginAt ?? null,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class SequelizeUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        const model = await UserModel.findByPk(id, { include: [ROLE_INCLUDE] });
        return model ? toUser(model) : null;
    }

    async list(filter: UserListFilter, { limit, offset }: PageRequest): Promise<Page<User>> {
        const conditions: WhereOptions<UserModel>[] = [];
        if (filter.isActive !== undefined) {
            conditions.push({ isActive: filter.isActive });
        }
        if (filter.search) {
            const pattern = { [Op.like]: `%${escapeLike(filter.search)}%` };
            conditions.push({
                [Op.or]: [
                    { firstName: pattern },
                    { lastName: pattern },
                    { email: pattern },
                    // So "ada obi" matches across the two columns.
                    where(fn("CONCAT", col("User.firstName"), " ", col("User.lastName")), pattern),
                ],
            });
        }

        const roleInclude: IncludeOptions = filter.roleTitle
            ? { ...ROLE_INCLUDE, where: { title: filter.roleTitle }, required: true }
            : ROLE_INCLUDE;

        const { rows, count } = await UserModel.findAndCountAll({
            where: { [Op.and]: conditions },
            include: [roleInclude],
            order: [["firstName", "ASC"], ["lastName", "ASC"], ["id", "ASC"]],
            limit,
            offset,
            // The nested permissions join multiplies rows; count users, not joined rows.
            distinct: true,
            col: "id",
        });
        return { items: rows.map(toUser), total: count };
    }

    async metrics(signedInSince: Date): Promise<UserMetrics> {
        const [total, active, signedIn] = await Promise.all([
            UserModel.count(),
            UserModel.count({ where: { isActive: true } }),
            UserModel.count({ where: { isActive: true, lastLoginAt: { [Op.gte]: signedInSince } } }),
        ]);
        return { total, active, inactive: total - active, signedInSince: signedIn };
    }

    async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
        const model = await UserModel.scope("withPassword").findOne({
            where: { email: normalizeEmail(email) },
            include: [ROLE_INCLUDE],
        });
        return model ? { user: toUser(model), passwordHash: model.passwordHash } : null;
    }

    async existsByEmail(email: string): Promise<boolean> {
        const count = await UserModel.count({ where: { email: normalizeEmail(email) } });
        return count > 0;
    }

    async create(input: CreateUserInput): Promise<User> {
        let created: UserModel;
        try {
            created = await UserModel.create(input);
        } catch (err) {
            // Closes the race between existsByEmail() and insert: the DB constraint is the source of truth.
            if (err instanceof UniqueConstraintError) {
                throw new ConflictError("a user with this email already exists");
            }
            throw err;
        }
        const user = await this.findById(created.id);
        if (!user) {
            throw new Error(`user ${created.id} disappeared immediately after creation`);
        }
        return user;
    }

    async recordLogin(id: string, at: Date): Promise<void> {
        await UserModel.update({ lastLoginAt: at }, { where: { id } });
    }
}
