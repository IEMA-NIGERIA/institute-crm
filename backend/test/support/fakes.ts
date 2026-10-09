import { randomUUID } from "node:crypto";
import {
    APPLICATION_STATUSES,
    type Application,
    type ApplicationListFilter,
    type ApplicationRepository,
    type ApplicationStatus,
} from "../../src/domain/application";
import type {
    AssignmentStatus,
    CreateEnquiryInput,
    Enquiry,
    EnquiryListFilter,
    EnquiryMetrics,
    EnquiryRepository,
    Page,
    UpdateEnquiryInput,
} from "../../src/domain/enquiry";
import { ASSIGNMENT_STATUSES } from "../../src/domain/enquiry";
import {
    duplicateOrganisationError,
    ORGANISATION_TYPES,
    registrationKey,
    type CreateOrganisationInput,
    type Organisation,
    type OrganisationDuplicate,
    type OrganisationKeys,
    type OrganisationListFilter,
    type OrganisationRepository,
    type OrganisationType,
} from "../../src/domain/organisation";
import type { PageRequest } from "../../src/domain/pagination";
import {
    DEFAULT_ROLE_PERMISSIONS,
    PERMISSION_DESCRIPTIONS,
    effectivePermissions,
    type Permission,
} from "../../src/domain/permissions";
import type {
    CreateUserInput,
    PermissionDefinition,
    Role,
    RoleRepository,
    User,
    UserCredentials,
    UserListFilter,
    UserMetrics,
    UserRepository,
} from "../../src/domain/user";
import { NotFoundError } from "../../src/errors/app-error";
import { BcryptPasswordHasher } from "../../src/infrastructure/password-hasher";
import { JwtTokenService } from "../../src/infrastructure/token-service";
import { createApp } from "../../src/app";
import { createContainer, type Infrastructure } from "../../src/bootstrap";
import { config } from "../../src/config";
import { logger } from "../../src/infrastructure/logger";
import { DEFAULT_ROLES } from "../../src/models/roles.model";

export class InMemoryRoleRepository implements RoleRepository {
    // Seeded with the same defaults as migration 0005.
    readonly roles: Role[] = DEFAULT_ROLES.map((title) => ({
        id: randomUUID(),
        title,
        description: null,
        permissions: effectivePermissions(title, DEFAULT_ROLE_PERMISSIONS[title] ?? []),
    }));

    async list(): Promise<Role[]> {
        return [...this.roles].sort((a, b) => a.title.localeCompare(b.title)).map((r) => ({ ...r }));
    }

    async findById(id: string): Promise<Role | null> {
        const role = this.roles.find((r) => r.id === id);
        return role ? { ...role, permissions: [...role.permissions] } : null;
    }

    async findByTitle(title: string): Promise<Role | null> {
        const role = this.roles.find((r) => r.title === title);
        return role ? { ...role, permissions: [...role.permissions] } : null;
    }

    async setPermissions(roleId: string, permissions: readonly Permission[]): Promise<Role> {
        const role = this.roles.find((r) => r.id === roleId);
        if (!role) throw new NotFoundError("role");
        role.permissions = effectivePermissions(role.title, permissions);
        return { ...role, permissions: [...role.permissions] };
    }

    async listPermissions(): Promise<PermissionDefinition[]> {
        return (Object.entries(PERMISSION_DESCRIPTIONS) as [Permission, string][])
            .map(([key, description]) => ({ key, description }))
            .sort((a, b) => a.key.localeCompare(b.key));
    }
}

interface StoredUser extends Omit<User, "role"> {
    roleId: string | null;
    passwordHash: string;
}

export class InMemoryUserRepository implements UserRepository {
    readonly rows = new Map<string, StoredUser>();

    constructor(private readonly roles: InMemoryRoleRepository) {}

    private toUser({ passwordHash: _hash, roleId, ...rest }: StoredUser): User {
        const role = this.roles.roles.find((r) => r.id === roleId);
        return { ...rest, role: role ? { ...role, permissions: [...role.permissions] } : null };
    }

    async findById(id: string): Promise<User | null> {
        const row = this.rows.get(id);
        return row ? this.toUser(row) : null;
    }

    async list(filter: UserListFilter, { limit, offset }: PageRequest): Promise<Page<User>> {
        const term = filter.search?.toLowerCase();
        const matches = [...this.rows.values()]
            .map((row) => this.toUser(row))
            .filter((u) => filter.isActive === undefined || u.isActive === filter.isActive)
            .filter((u) => !filter.roleTitle || u.role?.title === filter.roleTitle)
            .filter(
                (u) =>
                    !term ||
                    [u.firstName, u.lastName, u.email, `${u.firstName} ${u.lastName}`].some((v) => v.toLowerCase().includes(term)),
            )
            .sort((a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName) || a.id.localeCompare(b.id));
        return { items: matches.slice(offset, offset + limit), total: matches.length };
    }

    async metrics(signedInSince: Date): Promise<UserMetrics> {
        const rows = [...this.rows.values()];
        const active = rows.filter((r) => r.isActive);
        return {
            total: rows.length,
            active: active.length,
            inactive: rows.length - active.length,
            signedInSince: active.filter((r) => r.lastLoginAt && r.lastLoginAt >= signedInSince).length,
        };
    }

    async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
        const row = [...this.rows.values()].find((r) => r.email === email.toLowerCase());
        return row ? { user: this.toUser(row), passwordHash: row.passwordHash } : null;
    }

    async existsByEmail(email: string): Promise<boolean> {
        return (await this.findCredentialsByEmail(email)) !== null;
    }

    async create(input: CreateUserInput): Promise<User> {
        const now = new Date();
        const row: StoredUser = { ...input, id: randomUUID(), isActive: true, lastLoginAt: null, createdAt: now, updatedAt: now };
        this.rows.set(row.id, row);
        return this.toUser(row);
    }

    async recordLogin(id: string, at: Date): Promise<void> {
        const row = this.rows.get(id);
        if (row) row.lastLoginAt = at;
    }
}

export class InMemoryEnquiryRepository implements EnquiryRepository {
    readonly rows = new Map<string, Enquiry>();

    constructor(private readonly users: InMemoryUserRepository) {}

    private resolveAssignedTo(enquiry: Enquiry): Enquiry {
        if (!enquiry.assignedToId) return { ...enquiry, assignedTo: null };
        const row = this.users.rows.get(enquiry.assignedToId);
        return {
            ...enquiry,
            assignedTo: row ? { id: row.id, firstName: row.firstName, lastName: row.lastName } : null,
        };
    }

    async findById(id: string): Promise<Enquiry | null> {
        const row = this.rows.get(id);
        return row ? this.resolveAssignedTo(row) : null;
    }

    async list(filter: EnquiryListFilter, { limit, offset }: { limit: number; offset: number }): Promise<Page<Enquiry>> {
        const term = filter.search?.toLowerCase();
        const all = [...this.rows.values()]
            .filter((e) => !term || e.name.toLowerCase().includes(term) || (e.email?.toLowerCase().includes(term) ?? false))
            .filter((e) => !filter.assignmentStatus || e.assignmentStatus === filter.assignmentStatus)
            .filter((e) => !filter.pipelineStage || e.pipelineStage === filter.pipelineStage)
            .filter((e) => !filter.responseTag || e.responseTag === filter.responseTag)
            .reverse();
        return { items: all.slice(offset, offset + limit).map((e) => this.resolveAssignedTo(e)), total: all.length };
    }

    async create(input: CreateEnquiryInput): Promise<Enquiry> {
        const now = new Date();
        const enquiry: Enquiry = { ...input, id: randomUUID(), assignedTo: null, createdAt: now, updatedAt: now };
        this.rows.set(enquiry.id, enquiry);
        return this.resolveAssignedTo(enquiry);
    }

    async update(id: string, input: UpdateEnquiryInput): Promise<Enquiry> {
        const row = this.rows.get(id);
        if (!row) throw new Error(`enquiry ${id} not found`);
        const updated = { ...row, ...input, updatedAt: new Date() };
        this.rows.set(id, updated);
        return this.resolveAssignedTo(updated);
    }

    async countByStatus(): Promise<EnquiryMetrics> {
        const counts = Object.fromEntries(ASSIGNMENT_STATUSES.map((s) => [s, 0])) as Record<AssignmentStatus, number>;
        let total = 0;
        for (const row of this.rows.values()) {
            counts[row.assignmentStatus] += 1;
            total += 1;
        }
        return { total, ...counts };
    }
}

export class InMemoryApplicationRepository implements ApplicationRepository {
    readonly rows: Application[] = [];

    async list(filter: ApplicationListFilter, { limit, offset }: PageRequest): Promise<Page<Application>> {
        const term = filter.search?.toLowerCase();
        const matches = this.rows
            .filter((a) => !filter.statuses || filter.statuses.includes(a.status))
            .filter((a) => !filter.grade || a.grade === filter.grade)
            .filter((a) => {
                if (!term) return true;
                const { firstName, lastName, email } = a.applicant;
                return [a.reference, firstName, lastName, email, `${firstName} ${lastName}`].some((v) => v.toLowerCase().includes(term));
            })
            .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime() || a.id.localeCompare(b.id));
        return { items: matches.slice(offset, offset + limit), total: matches.length };
    }

    async countByStatus(statuses?: readonly ApplicationStatus[]): Promise<Record<ApplicationStatus, number>> {
        const counts = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
        for (const row of this.rows) {
            if (!statuses || statuses.includes(row.status)) counts[row.status] += 1;
        }
        return counts;
    }
}

/** Mirrors the database's unique indexes on nameKey and registrationKey. */
export class InMemoryOrganisationRepository implements OrganisationRepository {
    readonly rows: (Organisation & OrganisationKeys)[] = [];

    private static strip({ nameKey: _n, registrationKey: _r, ...organisation }: Organisation & OrganisationKeys): Organisation {
        return { ...organisation, types: [...organisation.types] };
    }

    async findById(id: string): Promise<Organisation | null> {
        const row = this.rows.find((r) => r.id === id);
        return row ? InMemoryOrganisationRepository.strip(row) : null;
    }

    async findDuplicate(keys: OrganisationKeys): Promise<OrganisationDuplicate | null> {
        const byReference = keys.registrationKey && this.rows.find((r) => r.registrationKey === keys.registrationKey);
        if (byReference) return { id: byReference.id, field: "registrationReference" };
        const byName = this.rows.find((r) => r.nameKey === keys.nameKey);
        return byName ? { id: byName.id, field: "name" } : null;
    }

    async create(input: CreateOrganisationInput, keys: OrganisationKeys): Promise<Organisation> {
        const duplicate = await this.findDuplicate(keys);
        if (duplicate) throw duplicateOrganisationError(duplicate);
        const now = new Date();
        const row = { ...input, ...keys, id: randomUUID(), profileCount: 0, createdAt: now, updatedAt: now };
        this.rows.push(row);
        return InMemoryOrganisationRepository.strip(row);
    }

    async list(filter: OrganisationListFilter, { limit, offset }: PageRequest): Promise<Page<Organisation>> {
        const term = filter.search?.toLowerCase();
        const termKey = filter.search ? registrationKey(filter.search) : "";
        const matches = this.rows
            .filter((o) => !filter.type || o.types.includes(filter.type))
            .filter((o) => !filter.sector || o.sector?.toLowerCase() === filter.sector.toLowerCase())
            .filter((o) => !filter.size || o.size === filter.size)
            .filter(
                (o) =>
                    !term ||
                    [o.name, o.registrationReference ?? "", o.website ?? ""].some((v) => v.toLowerCase().includes(term)) ||
                    (termKey !== "" && (o.registrationKey ?? "").includes(termKey)),
            )
            .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
        return { items: matches.slice(offset, offset + limit).map(InMemoryOrganisationRepository.strip), total: matches.length };
    }

    async countByType(): Promise<{ total: number; byType: Record<OrganisationType, number> }> {
        const byType = Object.fromEntries(ORGANISATION_TYPES.map((t) => [t, 0])) as Record<OrganisationType, number>;
        for (const row of this.rows) for (const type of row.types) byType[type] += 1;
        return { total: this.rows.length, byType };
    }
}

export const buildTestApp = () => {
    const roleRepository = new InMemoryRoleRepository();
    const userRepository = new InMemoryUserRepository(roleRepository);
    const enquiryRepository = new InMemoryEnquiryRepository(userRepository);
    const applicationRepository = new InMemoryApplicationRepository();
    const organisationRepository = new InMemoryOrganisationRepository();
    const infra: Infrastructure = {
        userRepository,
        roleRepository,
        enquiryRepository,
        applicationRepository,
        organisationRepository,
        passwordHasher: new BcryptPasswordHasher(4), // minimum cost: keeps tests fast
        tokenService: new JwtTokenService(config.auth.jwtSecret, config.auth.jwtIssuer, config.auth.jwtExpiresInSeconds),
    };
    const container = createContainer(config, infra, logger);
    const app = createApp({ config, logger, container, isReady: async () => true });
    return { app, infra, userRepository, roleRepository, enquiryRepository, applicationRepository, organisationRepository, services: container.services };
};
