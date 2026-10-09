import { z } from "zod";
import { APPLICATION_STATUSES, MEMBERSHIP_GRADES } from "../domain/application";

// Empty query params (`?status=`) mean "no filter".
const emptyAsUndefined = (value: unknown) => (value === "" ? undefined : value);

export const listApplicationsSchema = z.object({
    search: z.string().trim().max(100).optional().transform((value) => value || undefined),
    status: z.preprocess(emptyAsUndefined, z.enum(APPLICATION_STATUSES, { message: "unknown status" }).optional()),
    grade: z.preprocess(emptyAsUndefined, z.enum(MEMBERSHIP_GRADES, { message: "unknown grade" }).optional()),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type IListApplications = z.infer<typeof listApplicationsSchema>;
