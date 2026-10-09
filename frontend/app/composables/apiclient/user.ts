import { apiClient, toQuery, type IHTTPResponse } from "./api"
import type { IAuthUser } from "./auth"
import type { IOption } from "../format"

export const USERS_READ_PERMISSION = "users:read"
export const USERS_MANAGE_PERMISSION = "users:manage"
export const ROLES_MANAGE_PERMISSION = "roles:manage"
/** Always holds every permission; the API refuses to edit it. */
export const SYSTEM_ADMINISTRATOR_ROLE = "system administrator"

/** A staff account (same shape as the signed-in user). */
export type IStaffUser = IAuthUser

export interface IRole {
    id: string
    title: string
    description: string | null
    permissions: string[]
}

export interface IPermissionDefinition {
    key: string
    description: string
}

export interface IPermissionArea {
    key: string
    label: string
    permissions: IPermissionDefinition[]
}

const AREA_LABELS: Record<string, string> = {
    enquiries: "Enquiries",
    applications: "Membership applications",
    persons: "Profiles",
    interactions: "Interactions",
    events: "Events",
    communications: "Communications",
    certifications: "Certification",
    training: "Training",
    assessments: "Assessments",
    partnerships: "Partnerships",
    members: "Members",
    work: "Work allocation",
    reports: "Reports",
    payments: "Payments",
    system: "System",
    users: "Users",
    roles: "Roles",
    integrations: "Integrations",
    "audit-log": "Audit log",
}

/** Groups permission keys ("area:action") by area, keeping the catalog's order. */
export const groupPermissions = (catalog: IPermissionDefinition[]): IPermissionArea[] => {
    const areas = new Map<string, IPermissionArea>()
    for (const permission of catalog) {
        const key = permission.key.split(":")[0]!
        if (!areas.has(key)) areas.set(key, { key, label: AREA_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1), permissions: [] })
        areas.get(key)!.permissions.push(permission)
    }
    return [...areas.values()]
}

export interface ICreateRolePayload {
    title: string
    description: string | null
    permissions: string[]
}

/** Role titles are stored lower-case with single spaces, like the built-in roles. */
export const normaliseRoleTitle = (title: string) => title.trim().replace(/\s+/g, " ").toLowerCase()

export interface ICreateUserPayload {
    firstName: string
    lastName: string
    email: string
    password: string
    roleTitle: string | null
}

export interface IUpdateUserPayload {
    roleTitle?: string | null
    isActive?: boolean
}

export interface IUserMetrics {
    total: number
    active: number
    inactive: number
    signedInLast30Days: number
}

export interface IUserListQuery {
    search?: string
    /** Role title. */
    role?: string
    /** active | inactive */
    status?: string
    page?: number
    pageSize?: number
}

export const USER_STATUS_OPTIONS: IOption[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Deactivated" },
]

/** Same rules as the API: 12+ characters, at most 72 bytes (bcrypt's limit). */
export const PASSWORD_RULES = { minLength: 12, maxBytes: 72 }

export const passwordProblem = (password: string) => {
    if (password.length < PASSWORD_RULES.minLength) return `Use at least ${PASSWORD_RULES.minLength} characters`
    if (new TextEncoder().encode(password).length > PASSWORD_RULES.maxBytes) return "That password is too long"
    return null
}

/** A random 16-character password (no look-alike characters) for new accounts. */
export const generatePassword = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*"
    const bytes = crypto.getRandomValues(new Uint32Array(16))
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}

/** "membership officer" → "Membership officer". */
export const roleLabel = (title: string) => title.charAt(0).toUpperCase() + title.slice(1)

export const roleOptions = (roles: IRole[]): IOption[] => roles.map((role) => ({ value: role.title, label: roleLabel(role.title) }))

const base = "/api/v1/users"

export const userApi = {
    list: (query: IUserListQuery): Promise<IHTTPResponse> => apiClient.get(`${base}${toQuery({ ...query })}`),
    metrics: (): Promise<IHTTPResponse> => apiClient.get(`${base}/metrics`),
    create: (payload: ICreateUserPayload): Promise<IHTTPResponse> => apiClient.post(base, payload),
    update: (id: string, payload: IUpdateUserPayload): Promise<IHTTPResponse> => apiClient.patch(`${base}/${encodeURIComponent(id)}`, payload),
}

export const roleApi = {
    list: (): Promise<IHTTPResponse> => apiClient.get("/api/v1/roles"),
    create: (payload: ICreateRolePayload): Promise<IHTTPResponse> => apiClient.post("/api/v1/roles", payload),
    /** The permission catalog: `{ permissions: { key, description }[] }`. */
    permissions: (): Promise<IHTTPResponse> => apiClient.get("/api/v1/permissions"),
    /** Replaces the role's permissions with exactly this list. */
    updatePermissions: (id: string, permissions: string[]): Promise<IHTTPResponse> =>
        apiClient.put(`/api/v1/roles/${encodeURIComponent(id)}/permissions`, { permissions }),
}
