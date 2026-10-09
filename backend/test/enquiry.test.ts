import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { config } from "../src/config";
import { buildTestApp } from "./support/fakes";

const PASSWORD = "correct horse battery staple";

const setup = async () => {
    const ctx = buildTestApp();
    const officer = await ctx.services.user.create({
        firstName: "Tunde",
        lastName: "Bello",
        email: "officer@iema.org",
        password: PASSWORD,
        roleTitle: "membership officer",
    });
    await ctx.services.user.create({
        firstName: "Kemi",
        lastName: "Ade",
        email: "finance@iema.org",
        password: PASSWORD,
        roleTitle: "finance",
    });
    const login = async (email: string) => {
        const res = await request(ctx.app).post("/api/v1/auth/login").send({ email, password: PASSWORD }).expect(200);
        const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
        return cookies.find((c) => c.startsWith(`${config.cookie.name}=`))!.split(";")[0]!;
    };
    return { ...ctx, officer, login };
};

const validEnquiry = {
    enquirerType: "individual",
    name: "  Chioma Okafor ",
    email: "Chioma@Example.com",
    phone: "+234 803 123 4567",
    employer: "Shell Nigeria",
    sector: "Oil & Gas",
    addressLine1: " 12 Adeola Odeku Street ",
    city: "Victoria Island",
    stateProvince: "Lagos",
    postalCode: "101241",
    country: "Nigeria",
    interestType: "certification",
    source: "website",
    estimatedValue: 150000.5,
};

describe("POST /api/v1/enquiries", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    beforeEach(async () => {
        ctx = await setup();
    });

    it("creates an enquiry for an individual and records who created it", async () => {
        const res = await request(ctx.app)
            .post("/api/v1/enquiries")
            .set("Cookie", await ctx.login("officer@iema.org"))
            .send(validEnquiry)
            .expect(201);

        expect(res.body.enquiry).toMatchObject({
            enquirerType: "individual",
            name: "Chioma Okafor",
            email: "chioma@example.com",
            phone: "+234 803 123 4567",
            employer: "Shell Nigeria",
            sector: "Oil & Gas",
            addressLine1: "12 Adeola Odeku Street",
            city: "Victoria Island",
            stateProvince: "Lagos",
            postalCode: "101241",
            country: "Nigeria",
            interestType: "certification",
            source: "website",
            estimatedValue: 150000.5,
            createdById: ctx.officer.id,
            assignedToId: null,
            assignedTo: null,
            assignmentStatus: "unassigned",
            responseTag: null,
            pipelineStage: null,
            closingRemark: null,
        });
        expect(res.headers.location).toBe(`/api/v1/enquiries/${res.body.enquiry.id}`);
        expect(ctx.enquiryRepository.rows.size).toBe(1);
    });

    it("creates an enquiry for an organisation with only the required fields", async () => {
        const res = await request(ctx.app)
            .post("/api/v1/enquiries")
            .set("Cookie", await ctx.login("officer@iema.org"))
            .send({
                enquirerType: "organisation",
                name: "Dangote Group",
                phone: "08031234567",
                employer: "",
                interestType: "corporate_membership",
                source: "referral",
            })
            .expect(201);

        expect(res.body.enquiry).toMatchObject({
            email: null,
            employer: null,
            sector: null,
            addressLine1: null,
            city: null,
            stateProvince: null,
            postalCode: null,
            country: null,
            estimatedValue: null,
        });
    });

    it("requires at least one contact detail", async () => {
        const res = await request(ctx.app)
            .post("/api/v1/enquiries")
            .set("Cookie", await ctx.login("officer@iema.org"))
            .send({ ...validEnquiry, email: "", phone: null })
            .expect(400);
        expect(res.body.details).toEqual([{ path: "email", message: "please provide an email or a phone number" }]);
    });

    it("validates enumerations, contact formats and the estimated value", async () => {
        const res = await request(ctx.app)
            .post("/api/v1/enquiries")
            .set("Cookie", await ctx.login("officer@iema.org"))
            .send({
                ...validEnquiry,
                enquirerType: "alien",
                email: "not-an-email",
                phone: "call me",
                interestType: "lunch",
                source: "carrier pigeon",
                estimatedValue: -1,
            })
            .expect(400);
        expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual(
            ["email", "enquirerType", "estimatedValue", "interestType", "phone", "source"],
        );
    });

    it("rejects unauthenticated requests", async () => {
        await request(ctx.app).post("/api/v1/enquiries").send(validEnquiry).expect(401);
        expect(ctx.enquiryRepository.rows.size).toBe(0);
    });

    it("rejects roles that are not allowed to manage enquiries", async () => {
        await request(ctx.app)
            .post("/api/v1/enquiries")
            .set("Cookie", await ctx.login("finance@iema.org"))
            .send(validEnquiry)
            .expect(403);
        expect(ctx.enquiryRepository.rows.size).toBe(0);
    });
});

describe("GET /api/v1/enquiries", () => {
    it("lists enquiries newest first with pagination", async () => {
        const ctx = await setup();
        const cookie = await ctx.login("officer@iema.org");
        for (const name of ["First", "Second", "Third"]) {
            await request(ctx.app).post("/api/v1/enquiries").set("Cookie", cookie).send({ ...validEnquiry, name }).expect(201);
        }

        const res = await request(ctx.app).get("/api/v1/enquiries?page=1&pageSize=2").set("Cookie", cookie).expect(200);
        expect(res.body).toMatchObject({ page: 1, pageSize: 2, total: 3 });
        expect(res.body.enquiries.map((e: { name: string }) => e.name)).toEqual(["Third", "Second"]);

        const last = await request(ctx.app).get("/api/v1/enquiries?page=2&pageSize=2").set("Cookie", cookie).expect(200);
        expect(last.body.enquiries.map((e: { name: string }) => e.name)).toEqual(["First"]);
    });

    it("returns an empty page when there are no enquiries", async () => {
        const ctx = await setup();
        const res = await request(ctx.app).get("/api/v1/enquiries").set("Cookie", await ctx.login("officer@iema.org")).expect(200);
        expect(res.body).toEqual({ enquiries: [], page: 1, pageSize: 20, total: 0 });
    });

    it("validates pagination and enforces permissions", async () => {
        const ctx = await setup();
        await request(ctx.app).get("/api/v1/enquiries?pageSize=500").set("Cookie", await ctx.login("officer@iema.org")).expect(400);
        await request(ctx.app).get("/api/v1/enquiries").set("Cookie", await ctx.login("finance@iema.org")).expect(403);
        await request(ctx.app).get("/api/v1/enquiries").expect(401);
    });
});

describe("GET /api/v1/enquiries/:id", () => {
    it("returns a created enquiry and 404s for unknown ids", async () => {
        const ctx = await setup();
        const cookie = await ctx.login("officer@iema.org");
        const created = await request(ctx.app).post("/api/v1/enquiries").set("Cookie", cookie).send(validEnquiry).expect(201);

        const res = await request(ctx.app).get(created.headers.location!).set("Cookie", cookie).expect(200);
        expect(res.body.enquiry.id).toBe(created.body.enquiry.id);

        await request(ctx.app)
            .get("/api/v1/enquiries/00000000-0000-4000-8000-000000000000")
            .set("Cookie", cookie)
            .expect(404);
    });
});

describe("PATCH /api/v1/enquiries/:id", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    let cookie: string;
    let enquiryId: string;
    beforeEach(async () => {
        ctx = await setup();
        cookie = await ctx.login("officer@iema.org");
        const res = await request(ctx.app).post("/api/v1/enquiries").set("Cookie", cookie).send(validEnquiry).expect(201);
        enquiryId = res.body.enquiry.id;
    });

    const patch = (id: string, body: object) => request(ctx.app).patch(`/api/v1/enquiries/${id}`).set("Cookie", cookie).send(body);

    describe("assignment", () => {
        it("assigns a user and auto-promotes status to assigned", async () => {
            const res = await patch(enquiryId, { assignedToId: ctx.officer.id }).expect(200);
            expect(res.body.enquiry).toMatchObject({
                assignedToId: ctx.officer.id,
                assignedTo: { id: ctx.officer.id, firstName: "Tunde", lastName: "Bello" },
                assignmentStatus: "assigned",
            });
        });

        it("un-assigns a user and reverts status to unassigned", async () => {
            await patch(enquiryId, { assignedToId: ctx.officer.id }).expect(200);
            const res = await patch(enquiryId, { assignedToId: null }).expect(200);
            expect(res.body.enquiry).toMatchObject({
                assignedToId: null,
                assignedTo: null,
                assignmentStatus: "unassigned",
            });
        });

        it("rejects assignment to a non-existent user", async () => {
            const res = await patch(enquiryId, { assignedToId: "00000000-0000-4000-8000-000000000000" }).expect(400);
            expect(res.body.details[0].path).toBe("assignedToId");
        });
    });

    describe("response tag", () => {
        it("sets and clears the response tag", async () => {
            let res = await patch(enquiryId, { responseTag: "awaiting_response" }).expect(200);
            expect(res.body.enquiry.responseTag).toBe("awaiting_response");

            res = await patch(enquiryId, { responseTag: "needs_response" }).expect(200);
            expect(res.body.enquiry.responseTag).toBe("needs_response");

            res = await patch(enquiryId, { responseTag: null }).expect(200);
            expect(res.body.enquiry.responseTag).toBeNull();
        });
    });

    describe("pipeline stage", () => {
        it("moves through pipeline stages", async () => {
            let res = await patch(enquiryId, { pipelineStage: "information_sent" }).expect(200);
            expect(res.body.enquiry.pipelineStage).toBe("information_sent");

            res = await patch(enquiryId, { pipelineStage: "application_started" }).expect(200);
            expect(res.body.enquiry.pipelineStage).toBe("application_started");

            res = await patch(enquiryId, { pipelineStage: "converted" }).expect(200);
            expect(res.body.enquiry.pipelineStage).toBe("converted");
        });

        it("rejects unknown pipeline stages", async () => {
            await patch(enquiryId, { pipelineStage: "negotiation" }).expect(400);
        });
    });

    describe("closing", () => {
        it("requires a remark to close", async () => {
            const res = await patch(enquiryId, { assignmentStatus: "closed" }).expect(400);
            expect(res.body.details[0]).toMatchObject({ path: "closingRemark", message: "a remark is required to close an enquiry" });
        });

        it("closes with a remark", async () => {
            const res = await patch(enquiryId, { assignmentStatus: "closed", closingRemark: "Not interested after follow-up" }).expect(200);
            expect(res.body.enquiry).toMatchObject({
                assignmentStatus: "closed",
                closingRemark: "Not interested after follow-up",
            });
        });

        it("closes when remark was set earlier", async () => {
            await patch(enquiryId, { closingRemark: "Pre-written reason" }).expect(200);
            const res = await patch(enquiryId, { assignmentStatus: "closed" }).expect(200);
            expect(res.body.enquiry.assignmentStatus).toBe("closed");
            expect(res.body.enquiry.closingRemark).toBe("Pre-written reason");
        });
    });

    it("applies multiple changes in one request", async () => {
        const res = await patch(enquiryId, {
            assignedToId: ctx.officer.id,
            responseTag: "awaiting_response",
            pipelineStage: "information_sent",
        }).expect(200);
        expect(res.body.enquiry).toMatchObject({
            assignmentStatus: "assigned",
            responseTag: "awaiting_response",
            pipelineStage: "information_sent",
        });
    });

    it("returns 404 for unknown enquiry", async () => {
        await patch("00000000-0000-4000-8000-000000000000", { responseTag: "awaiting_response" }).expect(404);
    });

    it("requires enquiries:write permission", async () => {
        await request(ctx.app).patch(`/api/v1/enquiries/${enquiryId}`).send({ responseTag: "awaiting_response" }).expect(401);
        const finance = await ctx.login("finance@iema.org");
        await request(ctx.app).patch(`/api/v1/enquiries/${enquiryId}`).set("Cookie", finance).send({ responseTag: "awaiting_response" }).expect(403);
    });
});

describe("GET /api/v1/enquiries/metrics", () => {
    it("counts enquiries by assignment status", async () => {
        const ctx = await setup();
        const cookie = await ctx.login("officer@iema.org");
        const ids: string[] = [];
        for (const name of ["A", "B", "C", "D"]) {
            const res = await request(ctx.app).post("/api/v1/enquiries").set("Cookie", cookie).send({ ...validEnquiry, name }).expect(201);
            ids.push(res.body.enquiry.id);
        }
        await request(ctx.app).patch(`/api/v1/enquiries/${ids[0]}`).set("Cookie", cookie).send({ assignedToId: ctx.officer.id }).expect(200);
        await request(ctx.app).patch(`/api/v1/enquiries/${ids[1]}`).set("Cookie", cookie).send({ assignmentStatus: "closed", closingRemark: "Done" }).expect(200);

        const res = await request(ctx.app).get("/api/v1/enquiries/metrics").set("Cookie", cookie).expect(200);
        expect(res.body).toEqual({ total: 4, unassigned: 2, assigned: 1, closed: 1 });
    });

    it("requires enquiries:read", async () => {
        const ctx = await setup();
        await request(ctx.app).get("/api/v1/enquiries/metrics").expect(401);
        await request(ctx.app).get("/api/v1/enquiries/metrics").set("Cookie", await ctx.login("finance@iema.org")).expect(403);
    });
});

describe("GET /api/v1/enquiries (filters)", () => {
    it("filters by assignment status, pipeline stage and response tag", async () => {
        const ctx = await setup();
        const cookie = await ctx.login("officer@iema.org");
        const names = (res: request.Response) => res.body.enquiries.map((e: { name: string }) => e.name);

        for (const name of ["Alpha", "Beta", "Gamma"]) {
            await request(ctx.app).post("/api/v1/enquiries").set("Cookie", cookie).send({ ...validEnquiry, name }).expect(201);
        }
        const ids = [...ctx.enquiryRepository.rows.values()].map((e) => e.id);
        await request(ctx.app).patch(`/api/v1/enquiries/${ids[0]}`).set("Cookie", cookie).send({ assignedToId: ctx.officer.id, pipelineStage: "information_sent" }).expect(200);
        await request(ctx.app).patch(`/api/v1/enquiries/${ids[1]}`).set("Cookie", cookie).send({ responseTag: "awaiting_response" }).expect(200);

        expect(names(await request(ctx.app).get("/api/v1/enquiries?assignmentStatus=assigned").set("Cookie", cookie))).toEqual(["Alpha"]);
        expect(names(await request(ctx.app).get("/api/v1/enquiries?pipelineStage=information_sent").set("Cookie", cookie))).toEqual(["Alpha"]);
        expect(names(await request(ctx.app).get("/api/v1/enquiries?responseTag=awaiting_response").set("Cookie", cookie))).toEqual(["Beta"]);
        expect(names(await request(ctx.app).get("/api/v1/enquiries?assignmentStatus=unassigned").set("Cookie", cookie))).toEqual(["Gamma", "Beta"]);
    });

    it("searches by name and email", async () => {
        const ctx = await setup();
        const cookie = await ctx.login("officer@iema.org");
        await request(ctx.app).post("/api/v1/enquiries").set("Cookie", cookie).send({ ...validEnquiry, name: "Adaobi Nwosu" }).expect(201);
        await request(ctx.app).post("/api/v1/enquiries").set("Cookie", cookie).send({ ...validEnquiry, name: "Bola Tinubu", email: "bola@gov.ng" }).expect(201);

        const names = (res: request.Response) => res.body.enquiries.map((e: { name: string }) => e.name);
        expect(names(await request(ctx.app).get("/api/v1/enquiries?search=adaobi").set("Cookie", cookie))).toEqual(["Adaobi Nwosu"]);
        expect(names(await request(ctx.app).get("/api/v1/enquiries?search=bola@gov").set("Cookie", cookie))).toEqual(["Bola Tinubu"]);
    });
});
