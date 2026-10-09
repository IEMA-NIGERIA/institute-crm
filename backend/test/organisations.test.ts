import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { config } from "../src/config";
import { normalisePhone } from "../src/domain/contact";
import { formatCacNumber, organisationNameKey } from "../src/domain/organisation";
import { buildTestApp } from "./support/fakes";

const PASSWORD = "correct horse battery staple";

const STAFF = {
    officer: "membership officer", // persons:read + persons:write
    partnerships: "partnership officer", // persons:read only
    finance: "finance", // neither
} as const;

const dangote = {
    name: "Dangote Cement PLC",
    types: ["corporate_member", "employer"],
    registrationReference: "rc-208767",
    email: "Info@Dangote.com",
    phone: "0803 123 4567",
    sector: "Manufacturing",
    size: "1000+",
    website: "www.dangotecement.com",
    addressLine1: "1 Alfred Rewane Road",
    city: "Ikoyi",
    stateProvince: "Lagos",
    postalCode: "106104",
    country: "Nigeria",
};

const setup = async () => {
    const ctx = buildTestApp();
    for (const [key, roleTitle] of Object.entries(STAFF)) {
        await ctx.services.user.create({ firstName: key, lastName: "Staff", email: `${key}@iema.org`, password: PASSWORD, roleTitle });
    }
    const login = async (who: keyof typeof STAFF) => {
        const res = await request(ctx.app).post("/api/v1/auth/login").send({ email: `${who}@iema.org`, password: PASSWORD }).expect(200);
        const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
        return cookies.find((c) => c.startsWith(`${config.cookie.name}=`))!.split(";")[0]!;
    };
    return { ...ctx, login };
};

describe("POST /api/v1/organisations", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    let cookie: string;
    beforeEach(async () => {
        ctx = await setup();
        cookie = await ctx.login("officer");
    });

    const create = (body: object) => request(ctx.app).post("/api/v1/organisations").set("Cookie", cookie).send(body);
    const errorPaths = (res: request.Response) => res.body.details.map((d: { path: string }) => d.path).sort();

    it("stores the organisation record and normalises its fields", async () => {
        const res = await create(dangote).expect(201);
        expect(res.body.organisation).toEqual({
            id: expect.any(String),
            name: "Dangote Cement PLC",
            types: ["corporate_member", "employer"],
            registrationReference: "RC 208767",
            email: "info@dangote.com",
            phone: "+2348031234567",
            sector: "Manufacturing",
            size: "1000+",
            website: "https://www.dangotecement.com",
            addressLine1: "1 Alfred Rewane Road",
            city: "Ikoyi",
            stateProvince: "Lagos",
            postalCode: "106104",
            country: "Nigeria",
            profileCount: 0,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
        });
        expect(res.headers.location).toBe(`/api/v1/organisations/${res.body.organisation.id}`);
    });

    it("accepts a partner or employer with only a name and type", async () => {
        const res = await create({ name: "Lagos Business School", types: ["partner"] }).expect(201);
        expect(res.body.organisation).toMatchObject({ registrationReference: null, website: null, size: null });
    });

    describe("registration reference", () => {
        it("is mandatory for corporate members", async () => {
            const res = await create({ name: "Acme Ltd", types: ["corporate_member"] }).expect(400);
            expect(res.body.details).toEqual([{ path: "registrationReference", message: "an RC number is required for corporate members" }]);
        });

        it("must be a CAC number for corporate members", async () => {
            const res = await create({ name: "Acme Ltd", types: ["corporate_member"], registrationReference: "ABC-XYZ" }).expect(400);
            expect(errorPaths(res)).toEqual(["registrationReference"]);
            await create({ name: "Acme Ltd", types: ["corporate_member"], registrationReference: "BN 1234567" }).expect(201);
        });

        it("is mandatory for institutional members, as a free-form accreditation reference", async () => {
            await create({ name: "University of Lagos", types: ["institutional_member"] }).expect(400);
            const res = await create({
                name: "University of Lagos",
                types: ["institutional_member"],
                registrationReference: "NUC/ACC/2019/045",
            }).expect(201);
            expect(res.body.organisation.registrationReference).toBe("NUC/ACC/2019/045");
        });
    });

    it("validates email, phone, website, type and size", async () => {
        const res = await create({
            ...dangote,
            types: ["corporate_member", "charity"],
            email: "not-an-email",
            phone: "12345",
            website: "ftp://files.example.com",
            size: "huge",
        }).expect(400);
        expect(errorPaths(res)).toEqual(["email", "phone", "size", "types.1", "website"]);
    });

    it("accepts Nigerian and international phone formats", async () => {
        const res = await create({ name: "Shell Petroleum", types: ["partner"], phone: "+44 (0)20 7946 0958".replace("(0)", "") }).expect(201);
        expect(res.body.organisation.phone).toBe("+442079460958");
    });

    describe("duplicates", () => {
        beforeEach(async () => {
            await create(dangote).expect(201);
        });

        it.each([
            ["the same name with different case and punctuation", { name: "dangote cement plc.", registrationReference: "RC 999999" }],
            ["an equivalent legal form", { name: "Dangote Cement Public Limited Company", registrationReference: "RC 999999" }],
        ])("rejects %s", async (_label, overrides) => {
            const res = await create({ ...dangote, ...overrides }).expect(409);
            expect(res.body).toMatchObject({ code: "DUPLICATE", existingId: ctx.organisationRepository.rows[0]!.id });
            expect(res.body.details[0].path).toBe("name");
        });

        it.each(["RC 208767", "rc208767", "208767", "RC/208767"])("rejects the same RC number written as %s", async (reference) => {
            const res = await create({ ...dangote, name: "Totally Different Ltd", registrationReference: reference }).expect(409);
            expect(res.body.existingId).toBe(ctx.organisationRepository.rows[0]!.id);
            expect(res.body.details[0].path).toBe("registrationReference");
        });

        it("allows genuinely different organisations", async () => {
            await create({ ...dangote, name: "Dangote Sugar Refinery PLC", registrationReference: "RC 613748" }).expect(201);
            expect(ctx.organisationRepository.rows).toHaveLength(2);
        });
    });

    it("requires persons:write", async () => {
        await request(ctx.app).post("/api/v1/organisations").send(dangote).expect(401);
        await request(ctx.app).post("/api/v1/organisations").set("Cookie", await ctx.login("partnerships")).send(dangote).expect(403);
    });
});

describe("GET /api/v1/organisations", () => {
    let ctx: Awaited<ReturnType<typeof setup>>;
    let cookie: string;
    beforeEach(async () => {
        ctx = await setup();
        cookie = await ctx.login("officer");
        const seed = [
            dangote,
            { name: "University of Lagos", types: ["institutional_member"], registrationReference: "NUC/ACC/2019/045", sector: "Education", size: "1000+" },
            { name: "Lagos Business School", types: ["partner", "institutional_member"], registrationReference: "NUC-77", sector: "Education", size: "201-500" },
            { name: "Zenith Bank Plc", types: ["corporate_member"], registrationReference: "RC 150224", sector: "Finance", size: "1000+" },
            { name: "Andela", types: ["employer"], sector: "Technology", size: "501-1000", website: "https://andela.com" },
        ];
        for (const body of seed) await request(ctx.app).post("/api/v1/organisations").set("Cookie", cookie).send(body).expect(201);
    });

    const list = (query = "", as = cookie) => request(ctx.app).get(`/api/v1/organisations${query}`).set("Cookie", as);
    const names = (res: request.Response) => res.body.items.map((o: { name: string }) => o.name);

    it("lists organisations by name with their types", async () => {
        const res = await list().expect(200);
        expect(res.body).toMatchObject({ total: 5, page: 1, pageSize: 20 });
        expect(names(res)).toEqual(["Andela", "Dangote Cement PLC", "Lagos Business School", "University of Lagos", "Zenith Bank Plc"]);
        expect(res.body.items[2].types).toEqual(["institutional_member", "partner"]);
    });

    it("paginates", async () => {
        const res = await list("?page=2&pageSize=2").expect(200);
        expect(names(res)).toEqual(["Lagos Business School", "University of Lagos"]);
        expect(res.body.total).toBe(5);
    });

    it("searches name, registration reference (in any format) and website", async () => {
        expect(names(await list("?search=lagos"))).toEqual(["Lagos Business School", "University of Lagos"]);
        expect(names(await list("?search=rc150224"))).toEqual(["Zenith Bank Plc"]);
        expect(names(await list("?search=andela.com"))).toEqual(["Andela"]);
    });

    it("filters by type (keeping all of each organisation's types), sector and size", async () => {
        const partners = await list("?type=partner");
        expect(names(partners)).toEqual(["Lagos Business School"]);
        expect(partners.body.items[0].types).toEqual(["institutional_member", "partner"]);
        expect(names(await list("?type=institutional_member&size=1000%2B"))).toEqual(["University of Lagos"]);
        expect(names(await list("?sector=Education"))).toEqual(["Lagos Business School", "University of Lagos"]);
        expect((await list("?search=&type=&sector=&size=")).body.total).toBe(5);
    });

    it("validates query parameters", async () => {
        const res = await list("?type=charity&size=huge&pageSize=0").expect(400);
        expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual(["pageSize", "size", "type"]);
    });

    it("returns a single organisation, 404 for unknown ids", async () => {
        const id = ctx.organisationRepository.rows[0]!.id;
        const res = await request(ctx.app).get(`/api/v1/organisations/${id}`).set("Cookie", cookie).expect(200);
        expect(res.body.organisation.name).toBe("Dangote Cement PLC");
        await request(ctx.app).get("/api/v1/organisations/00000000-0000-4000-8000-000000000000").set("Cookie", cookie).expect(404);
    });

    it("counts each type for the metrics cards (an organisation can count towards several)", async () => {
        const res = await request(ctx.app).get("/api/v1/organisations/metrics").set("Cookie", cookie).expect(200);
        expect(res.body).toEqual({ total: 5, corporateMembers: 2, institutionalMembers: 2, partners: 1, employers: 2 });
    });

    it("allows persons:read holders and rejects everyone else", async () => {
        await list("", await ctx.login("partnerships")).expect(200);
        const finance = await ctx.login("finance");
        await list("", finance).expect(403);
        await request(ctx.app).get("/api/v1/organisations/metrics").set("Cookie", finance).expect(403);
    });
});

describe("normalisers", () => {
    it.each([
        ["0803 123 4567", "+2348031234567"],
        ["08031234567", "+2348031234567"],
        ["+234 803 123 4567", "+2348031234567"],
        ["2348031234567", "+2348031234567"],
        ["00234-803-123-4567", "+2348031234567"],
        ["+234 1 234 5678", "+23412345678"],
        ["+1 (415) 555-2671", "+14155552671"],
        ["0603 123 4567", null], // not a Nigerian mobile prefix
        ["+234 803 123", null], // too short
        ["12345", null],
        ["+0 123 456 789", null],
    ])("normalisePhone(%s) → %s", (input, expected) => {
        expect(normalisePhone(input)).toBe(expected);
    });

    it.each([
        ["Dangote Cement PLC.", "dangote cement plc"],
        ["Shell Nigeria Limited", "shell nigeria ltd"],
        ["  Procter & Gamble   Co ", "procter and gamble co"],
        ["Société Générale", "societe generale"],
    ])("organisationNameKey(%s) → %s", (input, expected) => {
        expect(organisationNameKey(input)).toBe(expected);
    });

    it.each([
        ["rc-208767", "RC 208767"],
        ["208767", "RC 208767"],
        ["BN/1234567", "BN 1234567"],
        ["llp 0042", "LLP 0042"],
        ["RC 123456789", null],
        ["ABC", null],
    ])("formatCacNumber(%s) → %s", (input, expected) => {
        expect(formatCacNumber(input)).toBe(expected);
    });
});
