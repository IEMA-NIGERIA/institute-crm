import type { Page, PageRequest } from "./pagination";
import type { Permission } from "./permissions";

export interface Role {
    id: string;
    title: string;
    description: string | null;
    permissions: Permission[];
}

export interface PermissionDefinition {
    key: Permission;
    description: string;
}

/** A user as exposed by the domain. Never carries credentials. */
export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    role: Role | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

/** Only used inside the auth flow; must never leave the service layer. */
export interface UserCredentials {
    user: User;
    passwordHash: string;
}

export interface CreateUserInput {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    roleId: string | null;
}

export const USER_STATUSES = ["active", "inactive"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserListFilter {
    /** Matched against first name, last name, full name and email (case-insensitive, substring). */
    search?: string;
    roleTitle?: string;
    isActive?: boolean;
}

export interface UserMetrics {
    total: number;
    active: number;
    inactive: number;
    /** Active users whose last sign-in is on or after `since`. */
    signedInSince: number;
}

export interface UserRepository {
    findById(id: string): Promise<User | null>;
    /** Ordered by first name, last name. */
    list(filter: UserListFilter, page: PageRequest): Promise<Page<User>>;
    metrics(signedInSince: Date): Promise<UserMetrics>;
    findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
    existsByEmail(email: string): Promise<boolean>;
    create(input: CreateUserInput): Promise<User>;
    recordLogin(id: string, at: Date): Promise<void>;
}

export interface RoleRepository {
    list(): Promise<Role[]>;
    findById(id: string): Promise<Role | null>;
    findByTitle(title: string): Promise<Role | null>;
    /** Replaces the role's permission set atomically. */
    setPermissions(roleId: string, permissions: readonly Permission[]): Promise<Role>;
    /** The permission catalog as stored in the database. */
    listPermissions(): Promise<PermissionDefinition[]>;
}

/** The authenticated caller, as established by the auth middleware. */
export interface AuthPrincipal {
    userId: string;
    role: string | null;
    permissions: ReadonlySet<Permission>;
}
