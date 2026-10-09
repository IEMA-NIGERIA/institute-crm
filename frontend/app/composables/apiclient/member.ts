import type { IProfileSummary } from "./profile"

/** Mirrors the backend `members` table, with its linked profile. */
export interface IMember {
    id: string
    membershipNumber: string
    grade: string
    status: string
    createdAt: string
    profile: IProfileSummary
}
