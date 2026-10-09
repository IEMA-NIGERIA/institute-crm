import { z } from "zod";
import { normalisePhone } from "../domain/contact";
import {
    formatCacNumber,
    isAccreditationReference,
    ORGANISATION_SIZES,
    ORGANISATION_TYPES,
} from "../domain/organisation";

/** Trims, and treats blank strings as "not provided". */
const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .nullish()
        .transform((value) => value || null);

const emptyAsNull = (value: unknown) => (value === "" || value === undefined ? null : value);

/** Adds https:// when the scheme is missing, and only accepts http(s) URLs with a real host. */
const website = optionalText(255).transform((value, ctx) => {
    if (value === null) return null;
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
    try {
        const url = new URL(withScheme);
        if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".")) {
            return url.toString().replace(/\/$/, "");
        }
    } catch {
        // fall through
    }
    ctx.addIssue({ code: "custom", message: "please provide a valid website address (http or https)" });
    return z.NEVER;
});

export const createOrganisationSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "please provide the organisation's name")
            .max(200)
            .transform((value) => value.replace(/\s+/g, " ")),
        types: z
            .array(z.enum(ORGANISATION_TYPES, { message: "unknown organisation type" }))
            .min(1, "choose at least one type")
            // De-duplicated, in catalogue order.
            .transform((types) => ORGANISATION_TYPES.filter((type) => types.includes(type))),
        /** RC number for companies, accreditation reference for institutions. */
        registrationReference: optionalText(50),
        email: z
            .string()
            .trim()
            .toLowerCase()
            .nullish()
            .transform((value) => value || null)
            .pipe(z.email({ message: "please provide a valid email" }).max(255).nullable()),
        phone: optionalText(30).transform((value, ctx) => {
            if (value === null) return null;
            const normalised = normalisePhone(value);
            if (normalised) return normalised;
            ctx.addIssue({
                code: "custom",
                message: "please provide a valid Nigerian (e.g. 0803 123 4567) or international (e.g. +44 20 7946 0958) phone number",
            });
            return z.NEVER;
        }),
        sector: optionalText(100),
        size: z.preprocess(emptyAsNull, z.enum(ORGANISATION_SIZES, { message: "unknown organisation size" }).nullable()),
        website,
        addressLine1: optionalText(255),
        city: optionalText(100),
        stateProvince: optionalText(100),
        postalCode: optionalText(20),
        country: optionalText(100),
    })
    .transform((input, ctx) => {
        const reference = input.registrationReference;
        const issue = (message: string) => {
            ctx.addIssue({ code: "custom", path: ["registrationReference"], message });
            return z.NEVER;
        };

        // Companies are identified by their CAC number, even if they are also an institution or partner.
        if (input.types.includes("corporate_member")) {
            if (reference === null) return issue("an RC number is required for corporate members");
            const formatted = formatCacNumber(reference);
            if (!formatted) return issue("please provide a valid CAC registration number (e.g. RC 123456)");
            return { ...input, registrationReference: formatted };
        }
        if (input.types.includes("institutional_member") && reference === null) {
            return issue("an accreditation reference is required for institutional members");
        }
        if (reference !== null && !isAccreditationReference(reference)) {
            return issue("registration reference may only contain letters, numbers, spaces and . / -");
        }
        return input;
    });
export type ICreateOrganisation = z.infer<typeof createOrganisationSchema>;

export const listOrganisationsSchema = z.object({
    search: z.string().trim().max(100).optional().transform((value) => value || undefined),
    type: z.preprocess(
        (value) => (value === "" ? undefined : value),
        z.enum(ORGANISATION_TYPES, { message: "unknown organisation type" }).optional(),
    ),
    sector: z.string().trim().max(100).optional().transform((value) => value || undefined),
    size: z.preprocess(
        (value) => (value === "" ? undefined : value),
        z.enum(ORGANISATION_SIZES, { message: "unknown organisation size" }).optional(),
    ),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type IListOrganisations = z.infer<typeof listOrganisationsSchema>;
