import type { Page, PageRequest } from "./pagination";

export type { Page } from "./pagination";

export const ENQUIRER_TYPES = ["individual", "organisation"] as const;
export type EnquirerType = (typeof ENQUIRER_TYPES)[number];

export const INTEREST_TYPES = [
    "membership_grade",
    "certification",
    "training_event",
    "corporate_membership",
    "partnership",
] as const;
export type InterestType = (typeof INTEREST_TYPES)[number];

export const ENQUIRY_SOURCES = [
    "website",
    "email",
    "phone",
    "referral",
    "event",
    "social_media",
    "walk_in",
    "other",
] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

export const ASSIGNMENT_STATUSES = ["unassigned", "assigned", "closed"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const RESPONSE_TAGS = ["awaiting_response", "needs_response"] as const;
export type ResponseTag = (typeof RESPONSE_TAGS)[number];

export const PIPELINE_STAGES = [
    "information_sent",
    "application_started",
    "payment_pending",
    "converted",
    "lost",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface AssignedUser {
    id: string;
    firstName: string;
    lastName: string;
}

export interface Enquiry {
    id: string;
    enquirerType: EnquirerType;
    /** Person's full name, or the organisation's name. */
    name: string;
    email: string | null;
    phone: string | null;
    employer: string | null;
    sector: string | null;
    addressLine1: string | null;
    city: string | null;
    stateProvince: string | null;
    postalCode: string | null;
    country: string | null;
    interestType: InterestType;
    source: EnquirySource;
    estimatedValue: number | null;
    assignedToId: string | null;
    assignedTo: AssignedUser | null;
    assignmentStatus: AssignmentStatus;
    responseTag: ResponseTag | null;
    pipelineStage: PipelineStage | null;
    closingRemark: string | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateEnquiryInput = Omit<Enquiry, "id" | "assignedTo" | "createdAt" | "updatedAt">;

export interface UpdateEnquiryInput {
    assignedToId?: string | null;
    assignmentStatus?: AssignmentStatus;
    responseTag?: ResponseTag | null;
    pipelineStage?: PipelineStage | null;
    closingRemark?: string | null;
}

export interface EnquiryListFilter {
    search?: string | undefined;
    assignmentStatus?: AssignmentStatus | undefined;
    pipelineStage?: PipelineStage | undefined;
    responseTag?: ResponseTag | undefined;
}

export interface EnquiryMetrics {
    total: number;
    unassigned: number;
    assigned: number;
    closed: number;
}

export interface EnquiryRepository {
    findById(id: string): Promise<Enquiry | null>;
    /** Newest first. */
    list(filter: EnquiryListFilter, page: PageRequest): Promise<Page<Enquiry>>;
    create(input: CreateEnquiryInput): Promise<Enquiry>;
    update(id: string, input: UpdateEnquiryInput): Promise<Enquiry>;
    countByStatus(): Promise<EnquiryMetrics>;
}
