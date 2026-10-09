import { apiClient, toQuery, type IHTTPResponse } from "./api"
import type { IOption } from "../format"
import type { IProfileSummary } from "./profile"
import type { BadgeTone } from "~/components/common/badge.vue"

/** Either lets a user see applications: staff read them, the Membership Committee reviews them. */
export const APPLICATION_VIEW_PERMISSIONS = ["applications:read", "applications:review"]

export const MEMBERSHIP_GRADE_OPTIONS: IOption[] = [
    { value: "student", label: "Student" },
    { value: "graduate", label: "Graduate" },
    { value: "associate", label: "Associate" },
    { value: "full", label: "Full Member" },
    { value: "fellow", label: "Fellow" },
]

/** Screening → Membership Committee → decision. */
export const APPLICATION_STATUS_OPTIONS: IOption[] = [
    { value: "submitted", label: "Submitted" },
    { value: "screening", label: "In screening" },
    { value: "info_requested", label: "Info requested" },
    { value: "with_committee", label: "With committee" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
]

export const APPLICATION_STATUS_TONES: Record<string, BadgeTone> = {
    submitted: "neutral",
    screening: "info",
    info_requested: "warning",
    with_committee: "info",
    approved: "success",
    rejected: "danger",
}

export interface IApplication {
    id: string
    /** Human-readable, e.g. "APP-2026-0042". */
    reference: string
    grade: string
    status: string
    applicant: IProfileSummary
    submittedAt: string
    updatedAt: string
    /** Set once approved or rejected. */
    decidedAt: string | null
}

export interface IApplicationMetrics {
    total: number
    awaitingScreening: number
    withCommittee: number
    approved: number
    rejected: number
}

export interface IApplicationListQuery {
    search?: string
    status?: string
    grade?: string
    page?: number
    pageSize?: number
}

const base = "/api/v1/applications"

export const applicationApi = {
    list: (query: IApplicationListQuery): Promise<IHTTPResponse> => apiClient.get(`${base}${toQuery({ ...query })}`),
    metrics: (): Promise<IHTTPResponse> => apiClient.get(`${base}/metrics`),
}
