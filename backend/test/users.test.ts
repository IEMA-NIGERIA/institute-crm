import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { config } from "../src/config";
import { SYSTEM_ADMINISTRATOR_ROLE } from "../src/domain/permissions";
import { buildTestApp } from "./support/fakes";

const PASSWORD = "correct horse battery staple";
const DAY = 24 * 60 * 60 * 1000;

const STAFF = [
    { firstName: "Ada", lastName: "Obi", email: "admin@iema.org", roleTitle: SYSTEM_ADMINISTRATOR_ROLE },
    { firstName: "Tunde", lastName: "Bello", email: "tunde@iema.org", roleTitle: "membership officer" },
    { firstName: "Chioma", lastName: "Okafor", email: "chioma@iema.org", roleTitle: "membership officer" },
    { firstName: "Kemi", lastName: "Ade", email: "kemi@iema.org", roleTitle: "finance" },
    { firstName: "Bayo", lastName: "Ola", email: "bayo_100%@iema.org", roleTitle: null },
];

const setup = async () => {
    const ctx = buildTestApp();
    const ids: Record<string, string> = {};
    for (const staff of STAFF) {
        ids[staff.firstName] = (await ctx.services.user.create({ ...staff, password: PASSWORD })).id;
    }
    const login = async (email: string) => {
        const res = await request(ctx.app).post("/api/v1/auth/login").send({ email, password: PASSWORD }).expect(200);
        const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
        return cookies.find((c) => c.startsWith(`${config.cookie.name}=`))!.split(";")[0]!;
    };
    return { ...ctx, ids, login };
};

describe("GET /api/v1/users", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    let cookie: string;
    beforeEach(async () => {
        ctx = await setup();
        cookie = await ctx.login("admin@iema.org");
    });

    const list = (query = "") => request(ctx.app).get(`/api/v1/users${query}`).set("Cookie", cookie);
    const names = (res: request.Response) => res.body.items.map((u: { firstName: string }) => u.firstName);

    it("returns every user, ordered by name, in the shape the users table expects", async () => {
        const res = await list().expect(200);
        expect(res.body.total).toBe(5);
        expect(res.body).toMatchObject({ page: 1, pageSize: 20 });
        expect(names(res)).toEqual(["Ada", "Bayo", "Chioma", "Kemi", "Tunde"]);
        expect(res.body.items.find((u: { firstName: string }) => u.firstName === "Kemi")).toEqual({
            id: ctx.ids["Kemi"],
            firstName: "Kemi",
            lastName: "Ade",
            email: "kemi@iema.org",
            isActive: true,
            role: { id: expect.any(String), title: "finance", permissions: ["payments:confirm-offline", "payments:read"] },
            lastLoginAt: null,
            createdAt: expect.any(String),
        });
        expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });

    it("paginates and reports the full total", async () => {
        const first = await list("?page=1&pageSize=2").expect(200);
        const third = await list("?page=3&pageSize=2").expect(200);
        expect(names(first)).toEqual(["Ada", "Bayo"]);
        expect(names(third)).toEqual(["Tunde"]);
        expect(third.body.total).toBe(5);
    });

    it("searches first name, last name, full name and email, case-insensitively", async () => {
        expect(names(await list("?search=okafor"))).toEqual(["Chioma"]);
        expect(names(await list("?search=TUNDE%20bel"))).toEqual(["Tunde"]);
        expect(names(await list("?search=kemi%40"))).toEqual(["Kemi"]);
    });

    it("treats search wildcards literally", async () => {
        expect(names(await list("?search=100%25"))).toEqual(["Bayo"]);
        expect(names(await list("?search=_"))).toEqual(["Bayo"]);
    });

    it("filters by role title and by status, and combines filters", async () => {
        expect(names(await list("?role=membership%20officer"))).toEqual(["Chioma", "Tunde"]);

        ctx.userRepository.rows.get(ctx.ids["Tunde"]!)!.isActive = false;
        expect(names(await list("?status=inactive"))).toEqual(["Tunde"]);
        expect(names(await list("?status=active&role=membership%20officer"))).toEqual(["Chioma"]);
    });

    it("ignores empty filters and returns nothing for unknown roles", async () => {
        expect((await list("?search=&role=&status=")).body.total).toBe(5);
        expect((await list("?role=wizard")).body).toMatchObject({ items: [], total: 0 });
    });

    it("validates query parameters", async () => {
        const res = await list("?status=sleeping&pageSize=500&page=0").expect(400);
        expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual(["page", "pageSize", "status"]);
    });

    it("requires users:read", async () => {
        await request(ctx.app).get("/api/v1/users").expect(401);
        await request(ctx.app).get("/api/v1/users").set("Cookie", await ctx.login("tunde@iema.org")).expect(403);
    });
});

describe("GET /api/v1/users/metrics", () => {
    it("counts total, active, deactivated and active users signed in during the last 30 days", async () => {
        const ctx = await setup();
        const cookie = await ctx.login("admin@iema.org"); // Ada signs in now
        const rows = ctx.userRepository.rows;
        rows.get(ctx.ids["Tunde"]!)!.lastLoginAt = new Date(Date.now() - 5 * DAY);
        rows.get(ctx.ids["Chioma"]!)!.lastLoginAt = new Date(Date.now() - 45 * DAY); // outside the window
        rows.get(ctx.ids["Kemi"]!)!.lastLoginAt = new Date(Date.now() - DAY);
        rows.get(ctx.ids["Kemi"]!)!.isActive = false; // deactivated users don't count as signed in

        const res = await request(ctx.app).get("/api/v1/users/metrics").set("Cookie", cookie).expect(200);
        expect(res.body).toEqual({ total: 5, active: 4, inactive: 1, signedInLast30Days: 2 });
    });

    it("requires users:read and is not mistaken for a user id", async () => {
        const ctx = await setup();
        await request(ctx.app).get("/api/v1/users/metrics").set("Cookie", await ctx.login("kemi@iema.org")).expect(403);
    });
});
