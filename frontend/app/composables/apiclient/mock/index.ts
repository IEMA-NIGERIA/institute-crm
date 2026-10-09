/**
 * In-browser stand-in for the profiles / organisations / documents / events / applications / users & roles API, until the backend exists.
 * Enabled with NUXT_PUBLIC_API_MOCK=true (see plugins/api.ts); requests it doesn't recognise go to
 * the real API. Data is kept for the browser tab (sessionStorage), so it survives reloads;
 * close the tab or run sessionStorage.removeItem("mock:db") to reset it.
 *
 * Sign in as (any password):
 *   admin@iema.mock    system administrator (every permission)
 *   reader@iema.mock   partnership officer (can view profiles, can't edit them)
 *   noaccess@iema.mock finance (payments only)
 * Their permissions come from their role in the mock's staff users and roles, so changing
 * a role or deactivating a user on the Users page takes effect immediately.
 *
 * In the browser console:
 *   localStorage.setItem("mock:delay", "1500")       slow every response (ms; default 300)
 *   localStorage.setItem("mock:fail", "/organisations") make matching URLs fail with a 500
 */
import type { IHTTPResponse, MockHandler } from "../api"
import type { IAffiliation, IProfile, IRelationship } from "../profile"
import type { IOrganisation } from "../organisation"
import type { IEvent } from "../event"
import { APPLICATION_VIEW_PERMISSIONS } from "../application"
import { createSeed, PERMISSION_DESCRIPTIONS, samplePdf, SIGN_IN_EMAILS, type MockDb, type MockStaffUser } from "./seed"

const API = "/api/v1"
const PERSONS_READ = "persons:read"
const PERSONS_WRITE = "persons:write"

type Body = Record<string, any>
type Route = {
    method: string
    pattern: RegExp
    /** The user needs at least one of these. */
    permission?: string | string[]
    /** Reachable without signing in. */
    public?: boolean
    handle: (match: { params: string[], query: URLSearchParams, body: any, onProgress?: (p: number) => void }) => IHTTPResponse | Promise<IHTTPResponse>
}

const readSetting = (key: string) => {
    try {
        return localStorage.getItem(key)
    } catch {
        return null
    }
}

const DB_KEY = "mock:db"

// File contents can't go in sessionStorage; after a reload, uploaded files download as a placeholder PDF.
const restoreDb = (): MockDb | null => {
    try {
        const raw = sessionStorage.getItem(DB_KEY)
        if (!raw) return null
        const saved = JSON.parse(raw) as MockDb
        // Data saved before a resource existed in the mock gets that resource's seed.
        return { ...createSeed(), ...saved, documents: saved.documents.map((d) => ({ ...d, blob: null })) }
    } catch {
        return null
    }
}

const saveDb = (db: MockDb) => {
    try {
        sessionStorage.setItem(DB_KEY, JSON.stringify({ ...db, documents: db.documents.map(({ blob: _blob, ...d }) => d) }))
    } catch { /* storage full or blocked: keep working in memory */ }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const ok = (body: unknown, statusCode = 200): IHTTPResponse => ({ statusCode, responseBody: body })
const fail = (statusCode: number, code: string, message: string, extra: Body = {}): IHTTPResponse =>
    ({ statusCode, responseBody: { message, code, ...extra, requestId: "mock" }, errorMessage: message })
const notFound = (what: string) => fail(404, "NOT_FOUND", `${what} not found`)
const invalid = (details: { path: string, message: string }[]) => fail(400, "VALIDATION_ERROR", "request validation failed", { details })

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null)
const now = () => new Date().toISOString()
const newId = () => crypto.randomUUID()
const includes = (haystack: string | null | undefined, needle: string) => (haystack ?? "").toLowerCase().includes(needle.toLowerCase())

const paginate = <T>(items: T[], query: URLSearchParams) => {
    const page = Math.max(1, Number(query.get("page")) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.get("pageSize")) || 20))
    return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length }
}

export const createMockHandler = (): MockHandler => {
    const db = restoreDb() ?? createSeed()
    let sessionEmail: string | null = readSetting("mock:session")

    /** The signed-in user, as stored in the staff list (so role changes and deactivation apply at once). */
    const currentUser = () => db.users.find((u) => u.email === sessionEmail && u.isActive) ?? null

    const toUserResponse = (user: MockStaffUser) => {
        const role = db.roles.find((r) => r.id === user.roleId)
        return {
            id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, isActive: user.isActive,
            role: role ? { id: role.id, title: role.title, permissions: role.permissions } : null,
            lastLoginAt: user.lastLoginAt, createdAt: user.createdAt,
        }
    }

    const byNewest = <T extends { createdAt: string }>(items: T[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const activeRelationships = (profileId: string) =>
        db.relationships.filter((r) => r.profileId === profileId && r.status === "active" && !r.endDate)

    const withRelationships = (profile: IProfile): IProfile => ({
        ...profile,
        relationships: activeRelationships(profile.id).map(({ type, status }) => ({ type, status })),
    })

    const withProfileCount = (organisation: IOrganisation): IOrganisation => ({
        ...organisation,
        profileCount: new Set(db.affiliations.filter((a) => a.organisation.id === organisation.id).map((a) => a.profile.id)).size,
    })

    const profileFields = (body: Body) => {
        const details: { path: string, message: string }[] = []
        const firstName = text(body.firstName)
        const lastName = text(body.lastName)
        const email = text(body.email)?.toLowerCase() ?? null
        const years = body.yearsOfExperience === null || body.yearsOfExperience === undefined || body.yearsOfExperience === "" ? null : Number(body.yearsOfExperience)
        if (!firstName) details.push({ path: "firstName", message: "please provide a first name" })
        if (!lastName) details.push({ path: "lastName", message: "please provide a last name" })
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) details.push({ path: "email", message: "please provide a valid email" })
        if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60)) details.push({ path: "yearsOfExperience", message: "years of experience must be a whole number from 0 to 60" })
        const fields = {
            title: text(body.title), firstName: firstName ?? "", lastName: lastName ?? "", email: email ?? "", mobile: text(body.mobile),
            employer: text(body.employer), jobRole: text(body.jobRole), sector: text(body.sector),
            highestQualification: text(body.highestQualification), yearsOfExperience: years,
            stateProvince: text(body.stateProvince), country: text(body.country),
        }
        return { details, fields }
    }

    const organisationFields = (body: Body) => {
        const details: { path: string, message: string }[] = []
        const name = text(body.name)
        const types = Array.isArray(body.types) ? body.types.filter((t: unknown) => typeof t === "string") : []
        const website = text(body.website)
        if (!name) details.push({ path: "name", message: "please provide the organisation's name" })
        if (!types.length) details.push({ path: "types", message: "choose at least one type" })
        if (website && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(website)) details.push({ path: "website", message: "please provide a full URL, e.g. https://example.com" })
        const fields = {
            name: name ?? "", types, registrationReference: text(body.registrationReference), sector: text(body.sector), size: text(body.size), website,
            addressLine1: text(body.addressLine1), city: text(body.city), stateProvince: text(body.stateProvince), postalCode: text(body.postalCode), country: text(body.country),
        }
        return { details, fields }
    }

    const findProfile = (id: string) => db.profiles.find((p) => p.id === id)
    const findOrganisation = (id: string) => db.organisations.find((o) => o.id === id)

    const routes: Route[] = [
        // ── Auth ──
        {
            method: "POST", pattern: /^\/auth\/login$/, public: true,
            handle: ({ body }) => {
                const email = text(body?.email)?.toLowerCase() ?? ""
                const user = SIGN_IN_EMAILS.includes(email) ? db.users.find((u) => u.email === email && u.isActive) : undefined
                if (!user) return fail(401, "INVALID_CREDENTIALS", "invalid email or password (mock users: admin@, reader@ or noaccess@iema.mock)")
                sessionEmail = user.email
                user.lastLoginAt = now()
                try { localStorage.setItem("mock:session", user.email) } catch { /* private mode */ }
                return ok({ message: "login successful", user: toUserResponse(user), expiresAt: new Date(Date.now() + 864e5).toISOString() })
            },
        },
        {
            method: "POST", pattern: /^\/auth\/logout$/, public: true,
            handle: () => {
                sessionEmail = null
                try { localStorage.removeItem("mock:session") } catch { /* private mode */ }
                return ok(undefined, 204)
            },
        },
        {
            method: "GET", pattern: /^\/users\/me$/,
            handle: () => ok({ user: toUserResponse(currentUser()!) }),
        },

        // ── Staff users & roles ──
        {
            method: "GET", pattern: /^\/roles$/,
            handle: () => ok({ roles: [...db.roles].sort((a, b) => a.title.localeCompare(b.title)) }),
        },
        {
            method: "GET", pattern: /^\/permissions$/, permission: "roles:manage",
            handle: () => ok({
                permissions: Object.entries(PERMISSION_DESCRIPTIONS)
                    .map(([key, description]) => ({ key, description }))
                    .sort((a, b) => a.key.localeCompare(b.key)),
            }),
        },
        {
            method: "POST", pattern: /^\/roles$/, permission: "roles:manage",
            handle: ({ body }) => {
                const b: Body = body ?? {}
                const title = typeof b.title === "string" ? b.title.trim().replace(/\s+/g, " ").toLowerCase() : ""
                const description = text(b.description)
                const keys: unknown = b.permissions ?? []
                const details: { path: string, message: string }[] = []
                if (title.length < 2 || title.length > 100) details.push({ path: "title", message: "role name must be 2 to 100 characters" })
                if (description && description.length > 255) details.push({ path: "description", message: "description must be at most 255 characters" })
                if (!Array.isArray(keys) || keys.some((k) => typeof k !== "string" || !(k in PERMISSION_DESCRIPTIONS)))
                    details.push({ path: "permissions", message: "unknown permission" })
                if (details.length) return invalid(details)
                const existing = db.roles.find((r) => r.title === title)
                if (existing) return fail(409, "CONFLICT", "a role with this name already exists", { existingId: existing.id })
                const role = { id: newId(), title, description, permissions: [...new Set(keys as string[])] }
                db.roles.push(role)
                return ok({ role }, 201)
            },
        },
        {
            method: "PUT", pattern: /^\/roles\/([^/]+)\/permissions$/, permission: "roles:manage",
            handle: ({ params, body }) => {
                const role = db.roles.find((r) => r.id === params[0])
                if (!role) return notFound("role")
                if (role.title === "system administrator")
                    return fail(409, "CONFLICT", "the system administrator role always has every permission and cannot be edited")
                const keys: unknown = body?.permissions
                if (!Array.isArray(keys) || keys.some((k) => typeof k !== "string" || !(k in PERMISSION_DESCRIPTIONS)))
                    return invalid([{ path: "permissions", message: "unknown permission" }])
                role.permissions = [...new Set(keys as string[])]
                return ok({ role })
            },
        },
        {
            method: "GET", pattern: /^\/users\/metrics$/, permission: "users:read",
            handle: () => ok({
                total: db.users.length,
                active: db.users.filter((u) => u.isActive).length,
                inactive: db.users.filter((u) => !u.isActive).length,
                signedInLast30Days: db.users.filter((u) => u.lastLoginAt && Date.now() - new Date(u.lastLoginAt).getTime() <= 30 * 864e5).length,
            }),
        },
        {
            method: "GET", pattern: /^\/users$/, permission: "users:read",
            handle: ({ query }) => {
                const search = query.get("search"), role = query.get("role"), status = query.get("status")
                const items = db.users
                    .filter((u) =>
                        (!search || includes(`${u.firstName} ${u.lastName}`, search) || includes(u.email, search)) &&
                        (!role || db.roles.find((r) => r.id === u.roleId)?.title === role) &&
                        (!status || (status === "active") === u.isActive))
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                return ok(paginate(items.map(toUserResponse), query))
            },
        },
        {
            method: "POST", pattern: /^\/users$/, permission: "users:manage",
            handle: ({ body }) => {
                const b: Body = body ?? {}
                const details: { path: string, message: string }[] = []
                const firstName = text(b.firstName), lastName = text(b.lastName), email = text(b.email)?.toLowerCase() ?? null
                const roleTitle = text(b.roleTitle)
                if (!firstName) details.push({ path: "firstName", message: "please provide a first name" })
                if (!lastName) details.push({ path: "lastName", message: "please provide a last name" })
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) details.push({ path: "email", message: "please provide a valid email" })
                if (typeof b.password !== "string" || b.password.length < 12) details.push({ path: "password", message: "password must be at least 12 characters" })
                const role = roleTitle ? db.roles.find((r) => r.title === roleTitle) : null
                if (roleTitle && !role) details.push({ path: "roleTitle", message: `unknown role "${roleTitle}"` })
                if (details.length) return invalid(details)
                if (db.users.some((u) => u.email === email)) return fail(409, "CONFLICT", "a user with this email already exists")
                const user: MockStaffUser = {
                    id: newId(), firstName: firstName!, lastName: lastName!, email: email!, isActive: true,
                    roleId: role?.id ?? null, lastLoginAt: null, createdAt: now(),
                }
                db.users.push(user)
                return ok({ user: toUserResponse(user) }, 201)
            },
        },
        {
            method: "PATCH", pattern: /^\/users\/([^/]+)$/, permission: "users:manage",
            handle: ({ params, body }) => {
                const user = db.users.find((u) => u.id === params[0])
                if (!user) return notFound("user")
                const b: Body = body ?? {}
                const isSelf = user.id === currentUser()?.id
                if (isSelf && b.isActive === false) return fail(409, "CONFLICT", "you can't deactivate your own account")
                if ("roleTitle" in b) {
                    const role = b.roleTitle ? db.roles.find((r) => r.title === b.roleTitle) : null
                    if (b.roleTitle && !role) return invalid([{ path: "roleTitle", message: `unknown role "${b.roleTitle}"` }])
                    if (isSelf && (role?.id ?? null) !== user.roleId) return fail(409, "CONFLICT", "you can't change your own role")
                    user.roleId = role?.id ?? null
                }
                if (typeof b.isActive === "boolean") user.isActive = b.isActive
                return ok({ user: toUserResponse(user) })
            },
        },

        // ── Profiles ──
        {
            method: "GET", pattern: /^\/profiles\/metrics$/, permission: PERSONS_READ,
            handle: () => {
                const countWith = (type: string) => db.profiles.filter((p) => activeRelationships(p.id).some((r) => r.type === type)).length
                return ok({
                    total: db.profiles.length,
                    professionalMembers: countWith("professional_member"),
                    candidates: countWith("cpea_candidate"),
                    linkedToOrganisation: new Set(db.affiliations.map((a) => a.profile.id)).size,
                })
            },
        },
        {
            method: "GET", pattern: /^\/profiles$/, permission: PERSONS_READ,
            handle: ({ query }) => {
                const search = query.get("search"), type = query.get("relationshipType"), sector = query.get("sector"), state = query.get("state"), email = query.get("email")
                const items = db.profiles.filter((p) =>
                    (!search || [`${p.firstName} ${p.lastName}`, p.email, p.mobile].some((v) => includes(v, search))) &&
                    (!type || activeRelationships(p.id).some((r) => r.type === type)) &&
                    (!sector || p.sector?.toLowerCase() === sector.toLowerCase()) &&
                    (!state || includes(p.stateProvince, state) || includes(p.country, state)) &&
                    (!email || p.email === email.toLowerCase()))
                return ok(paginate(byNewest(items).map(withRelationships), query))
            },
        },
        {
            method: "POST", pattern: /^\/profiles$/, permission: PERSONS_WRITE,
            handle: ({ body }) => {
                const { details, fields } = profileFields(body ?? {})
                if (details.length) return invalid(details)
                const existing = db.profiles.find((p) => p.email === fields.email)
                if (existing) return fail(409, "CONFLICT", "a profile with this email already exists", { existingId: existing.id })
                const profile: IProfile = { ...fields, id: newId(), relationships: [], createdAt: now(), updatedAt: now() }
                db.profiles.push(profile)
                return ok({ profile: withRelationships(profile) }, 201)
            },
        },
        {
            method: "GET", pattern: /^\/profiles\/([^/]+)$/, permission: PERSONS_READ,
            handle: ({ params }) => {
                const profile = findProfile(params[0]!)
                return profile ? ok({ profile: withRelationships(profile) }) : notFound("profile")
            },
        },
        {
            method: "PATCH", pattern: /^\/profiles\/([^/]+)$/, permission: PERSONS_WRITE,
            handle: ({ params, body }) => {
                const profile = findProfile(params[0]!)
                if (!profile) return notFound("profile")
                const { details, fields } = profileFields(body ?? {})
                if (details.length) return invalid(details)
                const existing = db.profiles.find((p) => p.email === fields.email && p.id !== profile.id)
                if (existing) return fail(409, "CONFLICT", "a profile with this email already exists", { existingId: existing.id })
                Object.assign(profile, fields, { updatedAt: now() })
                db.affiliations.filter((a) => a.profile.id === profile.id).forEach((a) => Object.assign(a.profile, {
                    title: profile.title, firstName: profile.firstName, lastName: profile.lastName, email: profile.email, mobile: profile.mobile,
                }))
                return ok({ profile: withRelationships(profile) })
            },
        },

        // ── Relationships ──
        {
            method: "GET", pattern: /^\/profiles\/([^/]+)\/relationships$/, permission: PERSONS_READ,
            handle: ({ params }) => findProfile(params[0]!)
                ? ok({ items: byNewest(db.relationships.filter((r) => r.profileId === params[0])) })
                : notFound("profile"),
        },
        {
            method: "POST", pattern: /^\/profiles\/([^/]+)\/relationships$/, permission: PERSONS_WRITE,
            handle: ({ params, body }) => {
                if (!findProfile(params[0]!)) return notFound("profile")
                const type = text(body?.type), status = text(body?.status)
                const details = [
                    ...(!type ? [{ path: "type", message: "choose a relationship type" }] : []),
                    ...(!status ? [{ path: "status", message: "choose a status" }] : []),
                ]
                if (details.length) return invalid(details)
                if (status === "active" && activeRelationships(params[0]!).some((r) => r.type === type))
                    return fail(409, "CONFLICT", "this profile already has an active relationship of this type")
                const relationship: IRelationship = {
                    id: newId(), profileId: params[0]!, type: type!, status: status!,
                    startDate: text(body.startDate), endDate: text(body.endDate), notes: text(body.notes), createdAt: now(),
                }
                db.relationships.push(relationship)
                return ok({ relationship }, 201)
            },
        },
        {
            method: "PATCH", pattern: /^\/profiles\/([^/]+)\/relationships\/([^/]+)$/, permission: PERSONS_WRITE,
            handle: ({ params, body }) => {
                const relationship = db.relationships.find((r) => r.id === params[1] && r.profileId === params[0])
                if (!relationship) return notFound("relationship")
                const next = { ...relationship, ...Object.fromEntries(Object.entries(body ?? {}).map(([k, v]) => [k, typeof v === "string" ? text(v) : v])) }
                if (next.status === "active" && !next.endDate &&
                    activeRelationships(params[0]!).some((r) => r.type === next.type && r.id !== relationship.id))
                    return fail(409, "CONFLICT", "this profile already has an active relationship of this type")
                Object.assign(relationship, next)
                return ok({ relationship })
            },
        },

        // ── Affiliations ──
        {
            method: "GET", pattern: /^\/profiles\/([^/]+)\/organisations$/, permission: PERSONS_READ,
            handle: ({ params }) => findProfile(params[0]!)
                ? ok({ items: db.affiliations.filter((a) => a.profile.id === params[0]) })
                : notFound("profile"),
        },
        {
            method: "GET", pattern: /^\/organisations\/([^/]+)\/profiles$/, permission: PERSONS_READ,
            handle: ({ params }) => findOrganisation(params[0]!)
                ? ok({ items: db.affiliations.filter((a) => a.organisation.id === params[0]) })
                : notFound("organisation"),
        },
        {
            method: "POST", pattern: /^\/affiliations$/, permission: PERSONS_WRITE,
            handle: ({ body }) => {
                const profile = findProfile(text(body?.profileId) ?? "")
                const organisation = findOrganisation(text(body?.organisationId) ?? "")
                const role = text(body?.role)
                const details = [
                    ...(!profile ? [{ path: "profileId", message: "choose a profile" }] : []),
                    ...(!organisation ? [{ path: "organisationId", message: "choose an organisation" }] : []),
                    ...(!role ? [{ path: "role", message: "choose a role" }] : []),
                ]
                if (details.length) return invalid(details)
                if (db.affiliations.some((a) => a.profile.id === profile!.id && a.organisation.id === organisation!.id && a.role === role))
                    return fail(409, "CONFLICT", "this profile already has that role at this organisation")
                const affiliation: IAffiliation = {
                    id: newId(), role: role!, since: text(body.since),
                    profile: { id: profile!.id, title: profile!.title, firstName: profile!.firstName, lastName: profile!.lastName, email: profile!.email, mobile: profile!.mobile },
                    organisation: { id: organisation!.id, name: organisation!.name },
                }
                db.affiliations.push(affiliation)
                return ok({ affiliation }, 201)
            },
        },
        {
            method: "DELETE", pattern: /^\/affiliations\/([^/]+)$/, permission: PERSONS_WRITE,
            handle: ({ params }) => {
                const index = db.affiliations.findIndex((a) => a.id === params[0])
                if (index < 0) return notFound("affiliation")
                db.affiliations.splice(index, 1)
                return ok(undefined, 204)
            },
        },

        // ── Documents ──
        {
            method: "GET", pattern: /^\/profiles\/([^/]+)\/documents$/, permission: PERSONS_READ,
            handle: ({ params }) => findProfile(params[0]!)
                ? ok({ items: byNewest(db.documents.filter((d) => d.profileId === params[0])).map(({ profileId: _p, blob: _b, ...doc }) => doc) })
                : notFound("profile"),
        },
        {
            method: "POST", pattern: /^\/profiles\/([^/]+)\/documents$/, permission: PERSONS_WRITE,
            handle: async ({ params, body, onProgress }) => {
                if (!findProfile(params[0]!)) return notFound("profile")
                const form = body as FormData
                const file = form?.get?.("file")
                const type = form?.get?.("type")
                if (!(file instanceof File)) return invalid([{ path: "file", message: "choose a file" }])
                if (typeof type !== "string" || !type) return invalid([{ path: "type", message: "choose a document type" }])
                if (file.size > 10 * 1024 * 1024) return invalid([{ path: "file", message: "file must be 10 MB or smaller" }])
                for (const percent of [15, 40, 70, 100]) {
                    await sleep(150)
                    onProgress?.(percent)
                }
                const document: MockDb["documents"][number] = {
                    id: newId(), profileId: params[0]!, type, fileName: file.name, contentType: file.type, size: file.size,
                    uploadedBy: { id: currentUser()!.id, name: `${currentUser()!.firstName} ${currentUser()!.lastName}` },
                    createdAt: now(), blob: file,
                }
                db.documents.push(document)
                const { profileId: _p, blob: _b, ...response } = document
                return ok({ document: response }, 201)
            },
        },
        {
            method: "GET", pattern: /^\/profiles\/([^/]+)\/documents\/([^/]+)\/download$/, permission: PERSONS_READ,
            handle: ({ params }) => {
                const document = db.documents.find((d) => d.id === params[1] && d.profileId === params[0])
                if (!document) return notFound("document")
                const url = URL.createObjectURL(document.blob ?? samplePdf())
                // Mirrors a short-lived signed URL.
                setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000)
                return ok({ url, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() })
            },
        },
        {
            method: "DELETE", pattern: /^\/profiles\/([^/]+)\/documents\/([^/]+)$/, permission: PERSONS_WRITE,
            handle: ({ params }) => {
                const index = db.documents.findIndex((d) => d.id === params[1] && d.profileId === params[0])
                if (index < 0) return notFound("document")
                db.documents.splice(index, 1)
                return ok(undefined, 204)
            },
        },

        // ── Events ──
        {
            method: "GET", pattern: /^\/events\/metrics$/,
            handle: () => {
                const now = Date.now(), soon = now + 30 * 864e5
                const upcoming = db.events.filter((e) => new Date(e.startsAt).getTime() > now)
                return ok({
                    total: db.events.length,
                    upcoming: upcoming.length,
                    nextThirtyDays: upcoming.filter((e) => new Date(e.startsAt).getTime() <= soon).length,
                    totalCapacity: upcoming.reduce((sum, e) => sum + (e.capacity ?? 0), 0),
                })
            },
        },
        {
            method: "GET", pattern: /^\/events$/,
            handle: ({ query }) => {
                const search = query.get("search"), type = query.get("type"), when = query.get("when")
                const now = Date.now()
                const timing = (e: IEvent) => new Date(e.endsAt).getTime() < now ? "past" : new Date(e.startsAt).getTime() <= now ? "ongoing" : "upcoming"
                const items = db.events
                    .filter((e) => (!search || includes(e.title, search) || includes(e.venueName, search)) && (!type || e.type === type) && (!when || timing(e) === when))
                    // Upcoming soonest first; past events after, most recent first.
                    .sort((a, b) => {
                        const pastA = timing(a) === "past", pastB = timing(b) === "past"
                        if (pastA !== pastB) return pastA ? 1 : -1
                        return pastA ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt)
                    })
                return ok(paginate(items, query))
            },
        },
        {
            method: "POST", pattern: /^\/events$/, permission: "events:manage-registrations",
            handle: ({ body }) => {
                const b: Body = body ?? {}
                const details: { path: string, message: string }[] = []
                const title = text(b.title), type = text(b.type), mode = text(b.deliveryMode)
                const startsAt = Date.parse(b.startsAt), endsAt = Date.parse(b.endsAt)
                const fee = (value: unknown) => (value === null || value === undefined || value === "" ? NaN : Number(value))
                const memberFee = fee(b.memberFee), nonMemberFee = fee(b.nonMemberFee)
                const capacity = b.capacity === null || b.capacity === undefined || b.capacity === "" ? null : Number(b.capacity)
                if (!title) details.push({ path: "title", message: "please provide a title" })
                if (!type) details.push({ path: "type", message: "choose an event type" })
                if (Number.isNaN(startsAt)) details.push({ path: "startsAt", message: "please provide a start date and time" })
                if (Number.isNaN(endsAt)) details.push({ path: "endsAt", message: "please provide an end date and time" })
                else if (!Number.isNaN(startsAt) && endsAt <= startsAt) details.push({ path: "endsAt", message: "the event must end after it starts" })
                if (!mode) details.push({ path: "deliveryMode", message: "choose how the event is delivered" })
                if (mode !== "online" && !text(b.venueName)) details.push({ path: "venueName", message: "please provide the venue" })
                if (mode && mode !== "in_person" && !/^https?:\/\/\S+\.\S+$/.test(text(b.onlineLink) ?? "")) details.push({ path: "onlineLink", message: "please provide a full meeting link, e.g. https://…" })
                if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) details.push({ path: "capacity", message: "capacity must be a whole number of at least 1" })
                if (Number.isNaN(memberFee) || memberFee < 0) details.push({ path: "memberFee", message: "please provide the member fee (0 for free)" })
                if (Number.isNaN(nonMemberFee) || nonMemberFee < 0) details.push({ path: "nonMemberFee", message: "please provide the non-member fee (0 for free)" })
                if (details.length) return invalid(details)
                const event: IEvent = {
                    id: newId(), title: title!, type: type!, description: text(b.description),
                    startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), deliveryMode: mode!,
                    venueName: mode === "online" ? null : text(b.venueName), venueAddress: mode === "online" ? null : text(b.venueAddress),
                    onlineLink: mode === "in_person" ? null : text(b.onlineLink),
                    capacity, memberFee, nonMemberFee, createdAt: now(), updatedAt: now(),
                }
                db.events.push(event)
                return ok({ event }, 201)
            },
        },

        // ── Membership applications ──
        {
            method: "GET", pattern: /^\/applications\/metrics$/, permission: APPLICATION_VIEW_PERMISSIONS,
            handle: () => {
                const count = (...statuses: string[]) => db.applications.filter((a) => statuses.includes(a.status)).length
                return ok({
                    total: db.applications.length,
                    awaitingScreening: count("submitted", "screening", "info_requested"),
                    withCommittee: count("with_committee"),
                    approved: count("approved"),
                    rejected: count("rejected"),
                })
            },
        },
        {
            method: "GET", pattern: /^\/applications$/, permission: APPLICATION_VIEW_PERMISSIONS,
            handle: ({ query }) => {
                const search = query.get("search"), status = query.get("status"), grade = query.get("grade")
                const items = db.applications
                    .filter((a) =>
                        (!search || [a.reference, `${a.applicant.firstName} ${a.applicant.lastName}`, a.applicant.email].some((v) => includes(v, search))) &&
                        (!status || a.status === status) &&
                        (!grade || a.grade === grade))
                    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
                return ok(paginate(items, query))
            },
        },

        // ── Organisations ──
        {
            method: "GET", pattern: /^\/organisations\/metrics$/, permission: PERSONS_READ,
            handle: () => {
                const count = (type: string) => db.organisations.filter((o) => o.types.includes(type)).length
                return ok({ total: db.organisations.length, corporateMembers: count("corporate_member"), institutionalMembers: count("institutional_member"), partners: count("partner") })
            },
        },
        {
            method: "GET", pattern: /^\/organisations$/, permission: PERSONS_READ,
            handle: ({ query }) => {
                const search = query.get("search"), type = query.get("type"), sector = query.get("sector"), size = query.get("size")
                const items = db.organisations.filter((o) =>
                    (!search || includes(o.name, search) || includes(o.registrationReference, search)) &&
                    (!type || o.types.includes(type)) &&
                    (!sector || o.sector?.toLowerCase() === sector.toLowerCase()) &&
                    (!size || o.size === size))
                return ok(paginate(byNewest(items).map(withProfileCount), query))
            },
        },
        {
            method: "POST", pattern: /^\/organisations$/, permission: PERSONS_WRITE,
            handle: ({ body }) => {
                const { details, fields } = organisationFields(body ?? {})
                if (details.length) return invalid(details)
                const existing = db.organisations.find((o) => o.name.toLowerCase() === fields.name.toLowerCase() ||
                    (fields.registrationReference && o.registrationReference?.toLowerCase() === fields.registrationReference.toLowerCase()))
                if (existing) return fail(409, "CONFLICT", "an organisation with this name or reference already exists", { existingId: existing.id })
                const organisation: IOrganisation = { ...fields, id: newId(), profileCount: 0, createdAt: now(), updatedAt: now() }
                db.organisations.push(organisation)
                return ok({ organisation }, 201)
            },
        },
        {
            method: "GET", pattern: /^\/organisations\/([^/]+)$/, permission: PERSONS_READ,
            handle: ({ params }) => {
                const organisation = findOrganisation(params[0]!)
                return organisation ? ok({ organisation: withProfileCount(organisation) }) : notFound("organisation")
            },
        },
        {
            method: "PATCH", pattern: /^\/organisations\/([^/]+)$/, permission: PERSONS_WRITE,
            handle: ({ params, body }) => {
                const organisation = findOrganisation(params[0]!)
                if (!organisation) return notFound("organisation")
                const { details, fields } = organisationFields(body ?? {})
                if (details.length) return invalid(details)
                const existing = db.organisations.find((o) => o.id !== organisation.id && (o.name.toLowerCase() === fields.name.toLowerCase() ||
                    (fields.registrationReference && o.registrationReference?.toLowerCase() === fields.registrationReference.toLowerCase())))
                if (existing) return fail(409, "CONFLICT", "an organisation with this name or reference already exists", { existingId: existing.id })
                Object.assign(organisation, fields, { updatedAt: now() })
                db.affiliations.filter((a) => a.organisation.id === organisation.id).forEach((a) => { a.organisation.name = organisation.name })
                return ok({ organisation: withProfileCount(organisation) })
            },
        },
    ]

    return async ({ method, url, data, onProgress }) => {
        const parsed = new URL(url, "http://mock")
        if (!parsed.pathname.startsWith(API)) return null
        const path = parsed.pathname.slice(API.length)
        for (const route of routes) {
            const match = route.method === method ? route.pattern.exec(path) : null
            if (!match) continue

            await sleep(Number(readSetting("mock:delay") ?? 300))
            const failOn = readSetting("mock:fail")
            if (failOn && url.includes(failOn)) return fail(500, "INTERNAL_ERROR", "internal server error (mock:fail)")
            if (!route.public) {
                const user = currentUser()
                if (!user) return fail(401, "UNAUTHORIZED", "unauthorised request")
                const permissions = db.roles.find((r) => r.id === user.roleId)?.permissions ?? []
                if (route.permission && ![route.permission].flat().some((p) => permissions.includes(p)))
                    return fail(403, "FORBIDDEN", "you do not have permission to perform this action")
            }
            const response = await route.handle({ params: match.slice(1).map(decodeURIComponent), query: parsed.searchParams, body: data, onProgress })
            if (method !== "GET") saveDb(db)
            return response
        }
        // Enquiries, … go to the real API.
        return null
    }
}
