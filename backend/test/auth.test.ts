import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { config } from "../src/config";
import { SYSTEM_ADMINISTRATOR_ROLE } from "../src/models/roles.model";
import { buildTestApp } from "./support/fakes";

const PASSWORD = "correct horse battery staple";

const setup = async () => {
    const ctx = buildTestApp();
    const admin = await ctx.services.user.create({
        firstName: "Ada",
        lastName: "Obi",
        email: "Admin@IEMA.org",
        password: PASSWORD,
        roleTitle: SYSTEM_ADMINISTRATOR_ROLE,
    });
    const officer = await ctx.services.user.create({
        firstName: "Tunde",
        lastName: "Bello",
        email: "officer@iema.org",
        password: PASSWORD,
        roleTitle: "membership officer",
    });
    return { ...ctx, admin, officer };
};

const sessionCookie = (res: request.Response): string => {
    const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
    const cookie = cookies.find((c) => c.startsWith(`${config.cookie.name}=`));
    if (!cookie) throw new Error("no session cookie set");
    return cookie.split(";")[0]!;
};

describe("POST /api/v1/auth/login", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    beforeEach(async () => {
        ctx = await setup();
    });

    it("issues a hardened httpOnly session cookie for valid credentials", async () => {
        const res = await request(ctx.app)
            .post("/api/v1/auth/login")
            .send({ email: "  ADMIN@iema.org ", password: PASSWORD })
            .expect(200);

        const raw = ([] as string[]).concat(res.headers["set-cookie"] ?? []).join(";");
        expect(raw).toMatch(/HttpOnly/i);
        expect(raw).toMatch(/Secure/i);
        expect(raw).toMatch(/SameSite=Lax/i);
        expect(res.body.user).toMatchObject({ email: "admin@iema.org", role: { title: SYSTEM_ADMINISTRATOR_ROLE } });
        expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
        expect(ctx.userRepository.rows.get(ctx.admin.id)?.lastLoginAt).toBeInstanceOf(Date);
    });

    it("rejects a wrong password (regression: un-awaited bcrypt compare let any password through)", async () => {
        const res = await request(ctx.app)
            .post("/api/v1/auth/login")
            .send({ email: "admin@iema.org", password: "definitely-not-it" })
            .expect(401);
        expect(res.headers["set-cookie"]).toBeUndefined();
        expect(res.body).toMatchObject({ code: "INVALID_CREDENTIALS" });
    });

    it("returns an identical response for unknown emails (no user enumeration)", async () => {
        const unknown = await request(ctx.app).post("/api/v1/auth/login").send({ email: "nobody@iema.org", password: "x" });
        const wrong = await request(ctx.app).post("/api/v1/auth/login").send({ email: "admin@iema.org", password: "x" });
        expect(unknown.status).toBe(401);
        expect({ ...unknown.body, requestId: undefined }).toEqual({ ...wrong.body, requestId: undefined });
    });

    it("rejects deactivated accounts", async () => {
        ctx.userRepository.rows.get(ctx.admin.id)!.isActive = false;
        await request(ctx.app).post("/api/v1/auth/login").send({ email: "admin@iema.org", password: PASSWORD }).expect(401);
    });

    it("validates the request body", async () => {
        const res = await request(ctx.app).post("/api/v1/auth/login").send({ email: "not-an-email" }).expect(400);
        expect(res.body.code).toBe("VALIDATION_ERROR");
        expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual(["email", "password"]);
    });

    it("returns 400 (not 500) for malformed JSON", async () => {
        const res = await request(ctx.app)
            .post("/api/v1/auth/login")
            .set("Content-Type", "application/json")
            .send("{bad json")
            .expect(400);
        expect(res.body.message).toBe("malformed JSON body");
    });

    it("rate-limits repeated failed attempts", async () => {
        for (let i = 0; i < config.auth.loginRateLimit.max; i++) {
            await request(ctx.app).post("/api/v1/auth/login").send({ email: "admin@iema.org", password: "wrong" }).expect(401);
        }
        const res = await request(ctx.app).post("/api/v1/auth/login").send({ email: "admin@iema.org", password: PASSWORD });
        expect(res.status).toBe(429);
        expect(res.body.code).toBe("RATE_LIMITED");
    });
});

describe("authenticated routes", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    beforeEach(async () => {
        ctx = await setup();
    });

    const login = async (email: string) =>
        sessionCookie(await request(ctx.app).post("/api/v1/auth/login").send({ email, password: PASSWORD }).expect(200));

    it("accepts the session cookie", async () => {
        const res = await request(ctx.app).get("/api/v1/users/me").set("Cookie", await login("admin@iema.org")).expect(200);
        expect(res.body.user.id).toBe(ctx.admin.id);
    });

    it("accepts an Authorization: Bearer token", async () => {
        const token = (await login("admin@iema.org")).split("=")[1]!;
        await request(ctx.app).get("/api/v1/users/me").set("Authorization", `Bearer ${token}`).expect(200);
    });

    it("rejects missing, tampered and foreign-signed tokens", async () => {
        await request(ctx.app).get("/api/v1/users/me").expect(401);
        const cookie = await login("admin@iema.org");
        await request(ctx.app).get("/api/v1/users/me").set("Cookie", `${cookie}x`).expect(401);
        await request(ctx.app)
            .get("/api/v1/users/me")
            .set("Authorization", "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.")
            .expect(401);
    });

    it("revokes access immediately when an account is deactivated", async () => {
        const cookie = await login("admin@iema.org");
        ctx.userRepository.rows.get(ctx.admin.id)!.isActive = false;
        await request(ctx.app).get("/api/v1/users/me").set("Cookie", cookie).expect(401);
    });

    it("logout clears the cookie", async () => {
        const res = await request(ctx.app).post("/api/v1/auth/logout").expect(204);
        expect(([] as string[]).concat(res.headers["set-cookie"] ?? []).join(";")).toMatch(
            new RegExp(`${config.cookie.name}=;.*Expires=Thu, 01 Jan 1970`, "i"),
        );
    });

    it("lets a system administrator create users", async () => {
        const res = await request(ctx.app)
            .post("/api/v1/users")
            .set("Cookie", await login("admin@iema.org"))
            .send({ firstName: "New", lastName: "User", email: "new@iema.org", password: "a-long-enough-password", roleTitle: "finance" })
            .expect(201);
        expect(res.body.user).toMatchObject({ email: "new@iema.org", role: { title: "finance" } });
        expect(res.headers["location"]).toBe(`/api/v1/users/${res.body.user.id}`);
    });

    it("returns 409 for duplicate emails and 400 for unknown roles", async () => {
        const cookie = await login("admin@iema.org");
        const body = { firstName: "A", lastName: "B", password: "a-long-enough-password" };
        await request(ctx.app).post("/api/v1/users").set("Cookie", cookie).send({ ...body, email: "OFFICER@iema.org" }).expect(409);
        await request(ctx.app).post("/api/v1/users").set("Cookie", cookie).send({ ...body, email: "x@iema.org", roleTitle: "wizard" }).expect(400);
    });

    it("forbids non-admins from admin routes", async () => {
        const cookie = await login("officer@iema.org");
        await request(ctx.app).get(`/api/v1/users/${ctx.admin.id}`).set("Cookie", cookie).expect(403);
        await request(ctx.app).post("/api/v1/users").set("Cookie", cookie).send({}).expect(403);
    });

    it("validates path params", async () => {
        const res = await request(ctx.app).get("/api/v1/users/not-a-uuid").set("Cookie", await login("admin@iema.org")).expect(400);
        expect(res.body.details[0].path).toBe("id");
    });

    it("lists roles", async () => {
        const res = await request(ctx.app).get("/api/v1/roles").set("Cookie", await login("officer@iema.org")).expect(200);
        expect(res.body.roles).toHaveLength(8);
    });
});

describe("platform", () => {
    it("serves health and readiness probes", async () => {
        const { app } = buildTestApp();
        await request(app).get("/health").expect(200, { status: "ok" });
        await request(app).get("/ready").expect(200);
    });

    it("returns JSON 404s with a request id", async () => {
        const { app } = buildTestApp();
        const res = await request(app).get("/api/v1/nope").expect(404);
        expect(res.body.code).toBe("NOT_FOUND");
        expect(res.body.requestId).toBe(res.headers["x-request-id"]);
    });

    it("propagates a well-formed upstream request id", async () => {
        const { app } = buildTestApp();
        const res = await request(app).get("/health").set("X-Request-Id", "lb-abc-123");
        expect(res.headers["x-request-id"]).toBe("lb-abc-123");
    });

    it("sends CORS credentials headers only to allowed origins", async () => {
        const { app } = buildTestApp();
        const allowed = await request(app).get("/health").set("Origin", "http://localhost:3000");
        expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
        expect(allowed.headers["access-control-allow-credentials"]).toBe("true");

        const denied = await request(app).get("/health").set("Origin", "https://evil.example");
        expect(denied.status).toBe(200);
        expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("sets security headers and hides the framework", async () => {
        const { app } = buildTestApp();
        const res = await request(app).get("/health");
        expect(res.headers["x-powered-by"]).toBeUndefined();
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["strict-transport-security"]).toBeDefined();
    });
});
