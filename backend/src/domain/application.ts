import type { Page, PageRequest } from "./pagination";

export const MEMBERSHIP_GRADES = ["student", "graduate", "associate", "full", "fellow"] as const;
export type MembershipGrade = (typeof MEMBERSHIP_GRADES)[number];

/** Screening → Membership Committee → decision. */
export const APPLICATION_STATUSES = [
    "submitted",
    "screening",
    "info_requested",
    "with_committee",
    "approved",
    "rejected",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Still with the membership team: not yet forwarded to the Committee. */
export const AWAITING_SCREENING_STATUSES = ["submitted", "screening", "info_requested"] as const satisfies readonly ApplicationStatus[];

/** Applications that have reached the Membership Committee (forwarded or decided). */
export const COMMITTEE_STATUSES = ["with_committee", "approved", "rejected"] as const satisfies readonly ApplicationStatus[];

export interface ApplicantSummary {
    id: string;
    title: string | null;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string | null;
}

export interface Application {
    id: string;
    /** Human-readable, e.g. "APP-2026-0042". */
    reference: string;
    grade: MembershipGrade;
    status: ApplicationStatus;
    applicant: ApplicantSummary;
    submittedAt: Date;
    updatedAt: Date;
    /** Set once approved or rejected. */
    decidedAt: Date | null;
}

export interface ApplicationListFilter {
    /** Matched against reference, applicant first/last/full name and email. */
    search?: string;
    grade?: MembershipGrade;
    /** Only applications whose status is one of these. */
    statuses?: readonly ApplicationStatus[];
}

export interface ApplicationMetrics {
    total: number;
    awaitingScreening: number;
    withCommittee: number;
    approved: number;
    rejected: number;
}

export interface ApplicationRepository {
    /** Newest submission first. */
    list(filter: ApplicationListFilter, page: PageRequest): Promise<Page<Application>>;
    /** Number of applications per status, restricted to `statuses` when given. */
    countByStatus(statuses?: readonly ApplicationStatus[]): Promise<Record<ApplicationStatus, number>>;
}
