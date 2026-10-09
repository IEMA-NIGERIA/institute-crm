import { apiClient, toQuery, type IHTTPResponse, type UploadProgress } from "./api"
import type { IOption } from "../format"

export const TITLE_OPTIONS: IOption[] = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Engr"].map((title) => ({ value: title, label: title }))

export const QUALIFICATION_OPTIONS: IOption[] = [
    { value: "ssce", label: "SSCE" },
    { value: "ond_nce", label: "OND / NCE" },
    { value: "hnd", label: "HND" },
    { value: "bachelors", label: "Bachelor's degree" },
    { value: "pgd", label: "Postgraduate diploma" },
    { value: "masters", label: "Master's degree" },
    { value: "phd", label: "PhD" },
    { value: "other", label: "Other" },
]

export const RELATIONSHIP_TYPE_OPTIONS: IOption[] = [
    { value: "professional_member", label: "Professional member" },
    { value: "student_member", label: "Student member" },
    { value: "cpea_candidate", label: "CPEA candidate" },
    { value: "training_delegate", label: "Training delegate" },
    { value: "conference_attendee", label: "Conference attendee" },
]

export const RELATIONSHIP_STATUS_OPTIONS: IOption[] = [
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "lapsed", label: "Lapsed" },
    { value: "completed", label: "Completed" },
]

export const AFFILIATION_ROLE_OPTIONS: IOption[] = [
    { value: "nominated_representative", label: "Nominated Representative" },
    { value: "hr_ld_contact", label: "HR / L&D Contact" },
    { value: "finance_contact", label: "Finance Contact" },
    { value: "staff_member", label: "Staff Member" },
]

export const DOCUMENT_TYPE_OPTIONS: IOption[] = [
    { value: "cv", label: "CV" },
    { value: "degree_certificate", label: "Degree certificate" },
    { value: "student_id", label: "Student ID" },
    { value: "evidence_of_experience", label: "Evidence of experience" },
    { value: "other", label: "Other" },
]

/** Accepted by the upload form; the API checks again. */
export const DOCUMENT_RULES = {
    accept: ".pdf,.jpg,.jpeg,.png,.docx",
    mimeTypes: ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    maxBytes: 10 * 1024 * 1024,
}

/** The fields shared by every view of a profile (members embed this too). */
export interface IProfileSummary {
    id: string
    title: string | null
    firstName: string
    lastName: string
    email: string
    mobile: string | null
}

export interface IProfilePayload extends Omit<IProfileSummary, "id"> {
    employer: string | null
    jobRole: string | null
    sector: string | null
    highestQualification: string | null
    yearsOfExperience: number | null
    stateProvince: string | null
    country: string | null
}

export interface IProfile extends IProfilePayload {
    id: string
    /** Active relationships, for badges. */
    relationships: { type: string, status: string }[]
    createdAt: string
    updatedAt: string
}

export interface IRelationshipPayload {
    type: string
    status: string
    startDate: string | null
    endDate: string | null
    notes: string | null
}

export interface IRelationship extends IRelationshipPayload {
    id: string
    profileId: string
    createdAt: string
}

export interface IAffiliation {
    id: string
    role: string
    since: string | null
    profile: IProfileSummary
    organisation: { id: string, name: string }
}

export interface IProfileDocument {
    id: string
    type: string
    fileName: string
    contentType: string
    size: number
    uploadedBy: { id: string, name: string } | null
    createdAt: string
}

export interface IProfileMetrics {
    total: number
    professionalMembers: number
    candidates: number
    linkedToOrganisation: number
}

export interface IProfileListQuery {
    search?: string
    relationshipType?: string
    sector?: string
    state?: string
    email?: string
    page?: number
    pageSize?: number
}

export const profileFullName = (profile: Pick<IProfileSummary, "title" | "firstName" | "lastName">) =>
    [profile.title, profile.firstName, profile.lastName].filter(Boolean).join(" ")

const base = "/api/v1/profiles"
const at = (id: string) => `${base}/${encodeURIComponent(id)}`

export const profileApi = {
    list: (query: IProfileListQuery): Promise<IHTTPResponse> => apiClient.get(`${base}${toQuery({ ...query })}`),
    metrics: (): Promise<IHTTPResponse> => apiClient.get(`${base}/metrics`),
    get: (id: string): Promise<IHTTPResponse> => apiClient.get(at(id)),
    create: (payload: IProfilePayload): Promise<IHTTPResponse> => apiClient.post(base, payload),
    update: (id: string, payload: IProfilePayload): Promise<IHTTPResponse> => apiClient.patch(at(id), payload),

    relationships: (id: string): Promise<IHTTPResponse> => apiClient.get(`${at(id)}/relationships`),
    addRelationship: (id: string, payload: IRelationshipPayload): Promise<IHTTPResponse> => apiClient.post(`${at(id)}/relationships`, payload),
    updateRelationship: (id: string, relationshipId: string, payload: Partial<IRelationshipPayload>): Promise<IHTTPResponse> =>
        apiClient.patch(`${at(id)}/relationships/${encodeURIComponent(relationshipId)}`, payload),

    organisations: (id: string): Promise<IHTTPResponse> => apiClient.get(`${at(id)}/organisations`),

    documents: (id: string): Promise<IHTTPResponse> => apiClient.get(`${at(id)}/documents`),
    uploadDocument: (id: string, file: File, type: string, onProgress?: UploadProgress): Promise<IHTTPResponse> => {
        const form = new FormData()
        form.append("type", type)
        form.append("file", file)
        return apiClient.upload(`${at(id)}/documents`, form, onProgress)
    },
    /** Returns `{ url, expiresAt }`: a short-lived signed link. Never store it. */
    documentDownload: (id: string, documentId: string): Promise<IHTTPResponse> =>
        apiClient.get(`${at(id)}/documents/${encodeURIComponent(documentId)}/download`),
    deleteDocument: (id: string, documentId: string): Promise<IHTTPResponse> =>
        apiClient.delete(`${at(id)}/documents/${encodeURIComponent(documentId)}`),
}

export const affiliationApi = {
    create: (payload: { profileId: string, organisationId: string, role: string, since: string | null }): Promise<IHTTPResponse> =>
        apiClient.post("/api/v1/affiliations", payload),
    remove: (id: string): Promise<IHTTPResponse> => apiClient.delete(`/api/v1/affiliations/${encodeURIComponent(id)}`),
}
