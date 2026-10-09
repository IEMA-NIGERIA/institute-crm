import { apiClient, toQuery, type IHTTPResponse } from "./api"
import type { IOption } from "../format"
import type { BadgeTone } from "~/components/common/badge.vue"

export const ORGANISATION_TYPE_OPTIONS: IOption[] = [
    { value: "corporate_member", label: "Corporate member" },
    { value: "institutional_member", label: "Institutional member" },
    { value: "partner", label: "Partner" },
    { value: "employer", label: "Employer" },
]

export const ORGANISATION_TYPE_TONES: Record<string, BadgeTone> = {
    corporate_member: "info",
    institutional_member: "success",
    partner: "warning",
    employer: "neutral",
}

export const ORGANISATION_SIZE_OPTIONS: IOption[] = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].map((size) => ({
    value: size,
    label: size === "1000+" ? "1,000+ staff" : `${size.replace("1000", "1,000").replace("-", "–")} staff`,
}))

export interface IOrganisationPayload {
    name: string
    types: string[]
    /** RC number for companies, accreditation reference for institutions. */
    registrationReference: string | null
    sector: string | null
    size: string | null
    website: string | null
    addressLine1: string | null
    city: string | null
    stateProvince: string | null
    postalCode: string | null
    country: string | null
}

export interface IOrganisation extends IOrganisationPayload {
    id: string
    profileCount: number
    createdAt: string
    updatedAt: string
}

export interface IOrganisationMetrics {
    total: number
    corporateMembers: number
    institutionalMembers: number
    partners: number
}

export interface IOrganisationListQuery {
    search?: string
    type?: string
    sector?: string
    size?: string
    page?: number
    pageSize?: number
}

/** "Accreditation reference" only when the organisation is purely an institution. */
export const registrationReferenceLabel = (types: string[]) =>
    types.length === 1 && types[0] === "institutional_member" ? "Accreditation reference" : "RC number"

export const websiteHost = (website: string | null) => {
    if (!website) return null
    try {
        return new URL(website).host.replace(/^www\./, "")
    } catch {
        return website
    }
}

const base = "/api/v1/organisations"
const at = (id: string) => `${base}/${encodeURIComponent(id)}`

export const organisationApi = {
    list: (query: IOrganisationListQuery): Promise<IHTTPResponse> => apiClient.get(`${base}${toQuery({ ...query })}`),
    metrics: (): Promise<IHTTPResponse> => apiClient.get(`${base}/metrics`),
    get: (id: string): Promise<IHTTPResponse> => apiClient.get(at(id)),
    create: (payload: IOrganisationPayload): Promise<IHTTPResponse> => apiClient.post(base, payload),
    update: (id: string, payload: IOrganisationPayload): Promise<IHTTPResponse> => apiClient.patch(at(id), payload),
    profiles: (id: string): Promise<IHTTPResponse> => apiClient.get(`${at(id)}/profiles`),
}
