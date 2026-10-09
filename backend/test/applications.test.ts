import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { config } from "../src/config";
import type { Application, ApplicationStatus, MembershipGrade } from "../src/domain/application";
import { SYSTEM_ADMINISTRATOR_ROLE } from "../src/domain/permissions";
import { buildTestApp } from "./support/fakes";

const PASSWORD = "correct horse battery staple";
const DAY = 24 * 60 * 60 * 1000;

const STAFF = {
    admin: SYSTEM_ADMINISTRATOR_ROLE,
    officer: "membership officer",
    committee: "membership committee",
    finance: "finance",
} as const;

let seq = 0;
const application = (
    firstName: string,
    lastName: string,
    status: ApplicationStatus,
    grade: MembershipGrade,
    daysAgo: number,
): Application => {
    const submittedAt = new Date(Date.now() - daysAgo * DAY);
    seq += 1;
    return {
        id: randomUUID(),
        reference: `APP-2026-${String(seq).padStart(4, "0")}`,
        grade,
        status,
        applicant: {
            id: randomUUID(),
            title: "Engr.",
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}@example.com`,
            mobile: null,
        },
        submittedAt,
        updatedAt: submittedAt,
        decidedAt: status === "approved" || status === "rejected" ? new Date(submittedAt.getTime() + 10 * DAY) : null,
    };
};

const setup = async () => {
    seq = 0;
    const ctx = buildTestApp();
    for (const [key, roleTitle] of Object.entries(STAFF)) {
        await ctx.services.user.create({ firstName: key, lastName: "Staff", email: `${key}@iema.org`, password: PASSWORD, roleTitle });
    }
    ctx.applicationRepository.rows.push(
        application("Chioma", "Okafor", "submitted", "graduate", 1), // APP-2026-0001
        application("Tunde", "Bello", "screening", "associate", 3), // 0002
        application("Ngozi", "Eze", "info_requested", "full", 5), // 0003
        application("Bayo", "Ola", "with_committee", "full", 8), // 0004
        application("Kemi", "Ade", "approved", "fellow", 20), // 0005
        application("Emeka", "Obi", "rejected", "student", 30), // 0006
        application("Ada", "Okafor", "approved", "graduate", 40), // 0007
    );
    const login = async (who: keyof typeof STAFF) => {
        const res = await request(ctx.app).post("/api/v1/auth/login").send({ email: `${who}@iema.org`, password: PASSWORD }).expect(200);
        const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
        return cookies.find((c) => c.startsWith(`${config.cookie.name}=`))!.split(";")[0]!;
    };
    return { ...ctx, login };
};

describe("GET /api/v1/applications", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    let cookie: string;
    beforeEach(async () => {
        ctx = await setup();
        cookie = await ctx.login("officer");
    });

    const list = (query = "", as = cookie) => request(ctx.app).get(`/api/v1/applications${query}`).set("Cookie", as);
    const refs = (res: request.Response) => res.body.items.map((a: { reference: string }) => a.reference.slice(-4));

    it("lists applications newest first in the shape the applications table expects", async () => {
        const res = await list().expect(200);
        expect(res.body).toMatchObject({ total: 7, page: 1, pageSize: 20 });
        expect(refs(res)).toEqual(["0001", "0002", "0003", "0004", "0005", "0006", "0007"]);
        expect(res.body.items[4]).toEqual({
            id: expect.any(String),
            reference: "APP-2026-0005",
            grade: "fellow",
            status: "approved",
            applicant: {
                id: expect.any(String),
                title: "Engr.",
                firstName: "Kemi",
                lastName: "Ade",
                email: "kemi@example.com",
                mobile: null,
            },
            submittedAt: expect.any(String),
            updatedAt: expect.any(String),
            decidedAt: expect.any(String),
        });
        expect(res.body.items[0].decidedAt).toBeNull();
    });

    it("paginates", async () => {
        const res = await list("?page=2&pageSize=3").expect(200);
        expect(refs(res)).toEqual(["0004", "0005", "0006"]);
        expect(res.body.total).toBe(7);
    });

    it("searches reference, applicant name, full name and email", async () => {
        expect(refs(await list("?search=app-2026-0003"))).toEqual(["0003"]);
        expect(refs(await list("?search=okafor"))).toEqual(["0001", "0007"]);
        expect(refs(await list("?search=tunde%20bello"))).toEqual(["0002"]);
        expect(refs(await list("?search=ngozi%40example"))).toEqual(["0003"]);
    });

    it("filters by status and grade, and combines them", async () => {
        expect(refs(await list("?status=approved"))).toEqual(["0005", "0007"]);
        expect(refs(await list("?grade=full"))).toEqual(["0003", "0004"]);
        expect(refs(await list("?status=approved&grade=graduate"))).toEqual(["0007"]);
        expect((await list("?search=&status=&grade=")).body.total).toBe(7);
    });

    it("validates query parameters", async () => {
        const res = await list("?status=lost&grade=wizard&pageSize=1000").expect(400);
        expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual(["grade", "pageSize", "status"]);
    });

    it("shows the Membership Committee only applications that reached it", async () => {
        const committee = await ctx.login("committee");
        expect(refs(await list("", committee))).toEqual(["0004", "0005", "0006", "0007"]);
        expect((await list("?status=submitted", committee)).body).toMatchObject({ items: [], total: 0 });
    });

    it("requires applications:read or applications:review", async () => {
        await request(ctx.app).get("/api/v1/applications").expect(401);
        await list("", await ctx.login("finance")).expect(403);
        await list("", await ctx.login("admin")).expect(200);
    });
});

describe("GET /api/v1/applications/metrics", () => {
    it("summarises the pipeline for staff", async () => {
        const ctx = await setup();
        const res = await request(ctx.app).get("/api/v1/applications/metrics").set("Cookie", await ctx.login("officer")).expect(200);
        expect(res.body).toEqual({ total: 7, awaitingScreening: 3, withCommittee: 1, approved: 2, rejected: 1 });
    });

    it("counts only the committee's applications for the committee", async () => {
        const ctx = await setup();
        const res = await request(ctx.app).get("/api/v1/applications/metrics").set("Cookie", await ctx.login("committee")).expect(200);
        expect(res.body).toEqual({ total: 4, awaitingScreening: 0, withCommittee: 1, approved: 2, rejected: 1 });
    });

    it("forbids roles without application access", async () => {
        const ctx = await setup();
        await request(ctx.app).get("/api/v1/applications/metrics").set("Cookie", await ctx.login("finance")).expect(403);
    });
});
