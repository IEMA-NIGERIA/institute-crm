import { apiClient, type IHTTPResponse } from "./api"

export const ENQUIRER_TYPE_OPTIONS = [
    { value: "individual", label: "Individual" },
    { value: "organisation", label: "Organisation" },
]

export const INTEREST_TYPE_OPTIONS = [
    { value: "membership_grade", label: "Membership grade" },
    { value: "certification", label: "Certification" },
    { value: "training_event", label: "Training / event" },
    { value: "corporate_membership", label: "Corporate / institutional membership" },
    { value: "partnership", label: "Partnership" },
]

export const ENQUIRY_SOURCE_OPTIONS = [
    { value: "website", label: "Website" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone call" },
    { value: "referral", label: "Referral" },
    { value: "event", label: "Event" },
    { value: "social_media", label: "Social media" },
    { value: "walk_in", label: "Walk-in" },
    { value: "other", label: "Other" },
]

export const ASSIGNMENT_STATUS_OPTIONS = [
    { value: "unassigned", label: "Unassigned" },
    { value: "assigned", label: "Assigned" },
    { value: "closed", label: "Closed" },
]

export const RESPONSE_TAG_OPTIONS = [
    { value: "awaiting_response", label: "Awaiting response" },
    { value: "needs_response", label: "Needs response" },
]

export const PIPELINE_STAGE_OPTIONS = [
    { value: "information_sent", label: "Information sent" },
    { value: "application_started", label: "Application started" },
    { value: "payment_pending", label: "Payment pending" },
    { value: "converted", label: "Converted" },
    { value: "lost", label: "Lost" },
]

export interface ICreateEnquiryPayload {
    enquirerType: string
    name: string
    email: string | null
    phone: string | null
    employer: string | null
    sector: string | null
    addressLine1: string | null
    city: string | null
    stateProvince: string | null
    postalCode: string | null
    country: string | null
    interestType: string
    source: string
    estimatedValue: number | null
}

export interface IUpdateEnquiryPayload {
    assignedToId?: string | null
    assignmentStatus?: string
    responseTag?: string | null
    pipelineStage?: string | null
    closingRemark?: string | null
}

export interface IAssignedUser {
    id: string
    firstName: string
    lastName: string
}

export interface IEnquiry extends ICreateEnquiryPayload {
    id: string
    assignedToId: string | null
    assignedTo: IAssignedUser | null
    assignmentStatus: string
    responseTag: string | null
    pipelineStage: string | null
    closingRemark: string | null
    createdById: string | null
    createdAt: string
    updatedAt: string
}

export interface IEnquiryMetrics {
    total: number
    unassigned: number
    assigned: number
    closed: number
}

export { formatDate, formatNaira, labelFor } from "../format"

export const enquiryApi = {
    get: (id: string): Promise<IHTTPResponse> => apiClient.get(`/api/v1/enquiries/${encodeURIComponent(id)}`),
    list: (page: number, pageSize: number, filters?: Record<string, string>): Promise<IHTTPResponse> => {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                if (value) params.set(key, value)
            }
        }
        return apiClient.get(`/api/v1/enquiries?${params}`)
    },
    create: (payload: ICreateEnquiryPayload): Promise<IHTTPResponse> => apiClient.post("/api/v1/enquiries", payload),
    update: (id: string, payload: IUpdateEnquiryPayload): Promise<IHTTPResponse> => apiClient.patch(`/api/v1/enquiries/${encodeURIComponent(id)}`, payload),
    metrics: (): Promise<IHTTPResponse> => apiClient.get("/api/v1/enquiries/metrics"),
}
