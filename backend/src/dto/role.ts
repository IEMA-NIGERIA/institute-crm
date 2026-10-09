import { z } from "zod";
import { ALL_PERMISSIONS } from "../domain/permissions";

export const updateRolePermissionsSchema = z.object({
    // Unique keys only; an empty list is allowed (revokes everything).
    permissions: z
        .array(z.enum(ALL_PERMISSIONS, { message: "unknown permission" }))
        .max(ALL_PERMISSIONS.length)
        .transform((keys) => [...new Set(keys)]),
});
export type IUpdateRolePermissions = z.infer<typeof updateRolePermissionsSchema>;
