import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { config } from "../src/config";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, SYSTEM_ADMINISTRATOR_ROLE } from "../src/domain/permissions";
import { DEFAULT_ROLES } from "../src/models/roles.model";
import { buildTestApp } from "./support/fakes";

const PASSWORD = "correct horse battery staple";

const enquiry = {
    enquirerType: "individual",
    name: "Chioma Okafor",
    email: "chioma@example.com",
    interestType: "certification",
    source: "website",
};

const USERS = {
    admin: SYSTEM_ADMINISTRATOR_ROLE,
    officer: "membership officer",
    registrar: "registrar/membership manager",
    committee: "membership committee",
    finance: "finance",
    council: "management / governing council",
} as const;
type UserKey = keyof typeof USERS;

const setup = async () => {
    const ctx = buildTestApp();
    for (const [key, roleTitle] of Object.entries(USERS)) {
        await ctx.services.user.create({ firstName: key, lastName: "Test", email: `${key}@iema.org`, password: PASSWORD, roleTitle });
    }
    const login = async (who: UserKey) => {
        const res = await request(ctx.app)
            .post("/api/v1/auth/login")
            .send({ email: `${who}@iema.org`, password: PASSWORD })
            .expect(200);
        const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
        return cookies.find((c) => c.startsWith(`${config.cookie.name}=`))!.split(";")[0]!;
    };
    const roleId = (title: string) => ctx.roleRepository.roles.find((r) => r.title === title)!.id;
    return { ...ctx, login, roleId };
};

describe("default role permissions", () => {
    it("only grants permissions that exist in the catalog, to roles that exist", () => {
        for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
            expect(DEFAULT_ROLES).toContain(role);
            for (const p of permissions) expect(ALL_PERMISSIONS).toContain(p);
        }
    });

    it("gives the registrar every membership officer permission", () => {
        const registrar = new Set(DEFAULT_ROLE_PERMISSIONS["registrar/membership manager"]);
        for (const p of DEFAULT_ROLE_PERMISSIONS["membership officer"]!) expect(registrar.has(p)).toBe(true);
    });

    it("keeps the membership committee to application review only", () => {
        expect(DEFAULT_ROLE_PERMISSIONS["membership committee"]).toEqual([PERMISSIONS.APPLICATIONS_REVIEW]);
    });
});

describe("permission enforcement", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    beforeEach(async () => {
        ctx = await setup();
    });

    it.each(["officer", "registrar", "admin"] as const)("%s can create and read enquiries", async (who) => {
        const cookie = await ctx.login(who);
        const created = await request(ctx.app).post("/api/v1/enquiries").set("Cookie", cookie).send(enquiry).expect(201);
        await request(ctx.app).get(created.headers.location!).set("Cookie", cookie).expect(200);
    });

    it.each(["committee", "finance", "council"] as const)("%s cannot create enquiries", async (who) => {
        await request(ctx.app).post("/api/v1/enquiries").set("Cookie", await ctx.login(who)).send(enquiry).expect(403);
        expect(ctx.enquiryRepository.rows.size).toBe(0);
    });

    it("gives the system administrator every permission in the catalog", async () => {
        const res = await request(ctx.app).get("/api/v1/users/me").set("Cookie", await ctx.login("admin")).expect(200);
        expect(res.body.user.role.permissions).toEqual([...ALL_PERMISSIONS].sort());
    });

    it("exposes the caller's permissions on /users/me", async () => {
        const res = await request(ctx.app).get("/api/v1/users/me").set("Cookie", await ctx.login("finance")).expect(200);
        expect(res.body.user.role.permissions).toEqual([PERMISSIONS.PAYMENTS_CONFIRM_OFFLINE, PERMISSIONS.PAYMENTS_READ]);
    });

    it("lists roles with their permissions to any authenticated user", async () => {
        const res = await request(ctx.app).get("/api/v1/roles").set("Cookie", await ctx.login("committee")).expect(200);
        const committee = res.body.roles.find((r: { title: string }) => r.title === "membership committee");
        expect(committee.permissions).toEqual([PERMISSIONS.APPLICATIONS_REVIEW]);
    });

    it("restricts the permission catalog to roles:manage", async () => {
        await request(ctx.app).get("/api/v1/permissions").set("Cookie", await ctx.login("officer")).expect(403);
        const res = await request(ctx.app).get("/api/v1/permissions").set("Cookie", await ctx.login("admin")).expect(200);
        expect(res.body.permissions).toHaveLength(ALL_PERMISSIONS.length);
        expect(res.body.permissions[0]).toEqual({ key: expect.any(String), description: expect.any(String) });
    });
});

describe("PUT /api/v1/roles/:id/permissions", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    beforeEach(async () => {
        ctx = await setup();
    });

    const put = async (who: UserKey, roleTitle: string, permissions: unknown) =>
        request(ctx.app)
            .put(`/api/v1/roles/${ctx.roleId(roleTitle)}/permissions`)
            .set("Cookie", await ctx.login(who))
            .send({ permissions });

    it("applies changes on the affected user's next request", async () => {
        const officerCookie = await ctx.login("officer");
        await request(ctx.app).post("/api/v1/enquiries").set("Cookie", officerCookie).send(enquiry).expect(201);

        const res = await put("admin", "membership officer", [PERMISSIONS.ENQUIRIES_READ, PERMISSIONS.ENQUIRIES_READ]);
        expect(res.status).toBe(200);
        expect(res.body.role.permissions).toEqual([PERMISSIONS.ENQUIRIES_READ]);

        // Same session, no re-login: permissions are resolved per request.
        await request(ctx.app).post("/api/v1/enquiries").set("Cookie", officerCookie).send(enquiry).expect(403);
    });

    it("can grant a permission to a role that lacked it", async () => {
        await put("admin", "finance", [PERMISSIONS.PAYMENTS_READ, PERMISSIONS.ENQUIRIES_READ]).then((r) => expect(r.status).toBe(200));
        const created = await request(ctx.app)
            .post("/api/v1/enquiries")
            .set("Cookie", await ctx.login("officer"))
            .send(enquiry)
            .expect(201);
        await request(ctx.app).get(created.headers.location!).set("Cookie", await ctx.login("finance")).expect(200);
    });

    it("forbids callers without roles:manage", async () => {
        expect((await put("registrar", "membership officer", [])).status).toBe(403);
    });

    it("rejects unknown permission keys", async () => {
        const res = await put("admin", "finance", ["payments:read", "launch:missiles"]);
        expect(res.status).toBe(400);
        expect(res.body.details[0].path).toBe("permissions.1");
    });

    it("refuses to edit the system administrator role, which always has every permission", async () => {
        const res = await put("admin", SYSTEM_ADMINISTRATOR_ROLE, [PERMISSIONS.USERS_MANAGE]);
        expect(res.status).toBe(409);
        expect(ctx.roleRepository.roles.find((r) => r.title === SYSTEM_ADMINISTRATOR_ROLE)!.permissions).toEqual(
            [...ALL_PERMISSIONS].sort(),
        );
        // Still able to do everything afterwards.
        await request(ctx.app).post("/api/v1/enquiries").set("Cookie", await ctx.login("admin")).send(enquiry).expect(201);
    });

    it("404s for unknown roles", async () => {
        await request(ctx.app)
            .put("/api/v1/roles/00000000-0000-4000-8000-000000000000/permissions")
            .set("Cookie", await ctx.login("admin"))
            .send({ permissions: [] })
            .expect(404);
    });
});
