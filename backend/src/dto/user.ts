import { z } from "zod";
import { USER_STATUSES } from "../domain/user";

const email = z.string().trim().toLowerCase().pipe(z.email({ message: "please provide a valid email" })).pipe(z.string().max(255));

export const loginSchema = z.object({
    email,
    // No complexity rules on login: they belong at password-set time. Cap length to bound bcrypt work.
    password: z.string().min(1, "please provide a password").max(128),
});
export type IUserLogin = z.infer<typeof loginSchema>;

export const passwordSchema = z
    .string()
    .min(12, "password must be at least 12 characters")
    // bcrypt only uses the first 72 bytes; multi-byte characters count more than once.
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "password must be at most 72 bytes");

export const createUserSchema = z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email,
    password: passwordSchema,
    roleTitle: z.string().trim().min(1).nullable().default(null),
});
export type IAdminCreateUser = z.infer<typeof createUserSchema>;

// Empty query params (`?search=`) mean "no filter".
const optionalFilter = (max: number) =>
    z.string().trim().max(max).optional().transform((value) => value || undefined);

export const listUsersSchema = z.object({
    search: optionalFilter(100),
    /** Role title. */
    role: optionalFilter(100),
    status: z.preprocess(
        (value) => (value === "" ? undefined : value),
        z.enum(USER_STATUSES, { message: 'status must be "active" or "inactive"' }).optional(),
    ),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type IListUsers = z.infer<typeof listUsersSchema>;

export const idParamSchema = z.object({
    id: z.uuid({ message: "id must be a valid UUID" }),
});
