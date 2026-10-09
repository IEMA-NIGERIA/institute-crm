import { z } from "zod";
import {
    ASSIGNMENT_STATUSES,
    ENQUIRER_TYPES,
    ENQUIRY_SOURCES,
    INTEREST_TYPES,
    PIPELINE_STAGES,
    RESPONSE_TAGS,
} from "../domain/enquiry";

/** Trims, and treats blank strings as "not provided". */
const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .nullish()
        .transform((value) => value || null);

const emptyAsUndefined = (value: unknown) => (value === "" ? undefined : value);

export const createEnquirySchema = z
    .object({
        enquirerType: z.enum(ENQUIRER_TYPES),
        name: z.string().trim().min(1, "please provide a name").max(200),
        email: z
            .string()
            .trim()
            .toLowerCase()
            .nullish()
            .transform((value) => value || null)
            .pipe(z.email({ message: "please provide a valid email" }).max(255).nullable()),
        phone: optionalText(30).pipe(
            z.string().regex(/^\+?[0-9 ()-]{7,30}$/, "please provide a valid phone number").nullable(),
        ),
        employer: optionalText(200),
        sector: optionalText(100),
        addressLine1: optionalText(255),
        city: optionalText(100),
        stateProvince: optionalText(100),
        postalCode: optionalText(20),
        country: optionalText(100),
        interestType: z.enum(INTEREST_TYPES),
        source: z.enum(ENQUIRY_SOURCES),
        // Matches the DECIMAL(15,2) column.
        estimatedValue: z
            .number()
            .nonnegative("estimated value cannot be negative")
            .max(9_999_999_999_999.99)
            .multipleOf(0.01, "estimated value can have at most 2 decimal places")
            .nullish()
            .transform((value) => value ?? null),
    })
    .refine((input) => input.email !== null || input.phone !== null, {
        message: "please provide an email or a phone number",
        path: ["email"],
    });
export type ICreateEnquiry = z.infer<typeof createEnquirySchema>;

export const updateEnquirySchema = z.object({
    assignedToId: z.string().uuid("please provide a valid user id").nullable().optional(),
    assignmentStatus: z.preprocess(emptyAsUndefined, z.enum(ASSIGNMENT_STATUSES).optional()),
    responseTag: z.preprocess(
        emptyAsUndefined,
        z.enum(RESPONSE_TAGS, { message: "unknown response tag" }).nullable().optional(),
    ),
    pipelineStage: z.preprocess(
        emptyAsUndefined,
        z.enum(PIPELINE_STAGES, { message: "unknown pipeline stage" }).nullable().optional(),
    ),
    closingRemark: z.string().trim().min(1, "a remark is required to close an enquiry").max(2000).nullable().optional(),
});
export type IUpdateEnquiry = z.infer<typeof updateEnquirySchema>;

export const listEnquiriesSchema = z.object({
    search: z.string().trim().max(100).optional().transform((value) => value || undefined),
    assignmentStatus: z.preprocess(emptyAsUndefined, z.enum(ASSIGNMENT_STATUSES).optional()),
    pipelineStage: z.preprocess(emptyAsUndefined, z.enum(PIPELINE_STAGES).optional()),
    responseTag: z.preprocess(emptyAsUndefined, z.enum(RESPONSE_TAGS).optional()),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type IListEnquiries = z.infer<typeof listEnquiriesSchema>;
