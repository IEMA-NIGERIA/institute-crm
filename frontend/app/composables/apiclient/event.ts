import { apiClient, toQuery, type IHTTPResponse } from "./api"
import type { IOption } from "../format"
import type { BadgeTone } from "~/components/common/badge.vue"

/** Users with this permission can create events (the API enforces it too). */
export const EVENTS_MANAGE_PERMISSION = "events:manage-registrations"

export const EVENT_TYPE_OPTIONS: IOption[] = [
    { value: "training_course", label: "Training course" },
    { value: "workshop", label: "Workshop" },
    { value: "seminar", label: "Seminar" },
    { value: "conference", label: "Conference" },
    { value: "award_ceremony", label: "Award ceremony" },
]

export const EVENT_TYPE_TONES: Record<string, BadgeTone> = {
    training_course: "info",
    workshop: "success",
    seminar: "neutral",
    conference: "warning",
    award_ceremony: "danger",
}

export const DELIVERY_MODE_OPTIONS: IOption[] = [
    { value: "in_person", label: "In person" },
    { value: "online", label: "Online" },
    { value: "hybrid", label: "Hybrid (in person + online)" },
]

export const EVENT_TIMEFRAME_OPTIONS: IOption[] = [
    { value: "upcoming", label: "Upcoming" },
    { value: "ongoing", label: "Happening now" },
    { value: "past", label: "Past" },
]

export interface IEventPayload {
    title: string
    type: string
    description: string | null
    /** ISO timestamps. */
    startsAt: string
    endsAt: string
    deliveryMode: string
    venueName: string | null
    venueAddress: string | null
    onlineLink: string | null
    /** null = unlimited. */
    capacity: number | null
    /** NGN; 0 = free. */
    memberFee: number
    nonMemberFee: number
}

export interface IEvent extends IEventPayload {
    id: string
    createdAt: string
    updatedAt: string
}

export interface IEventMetrics {
    total: number
    upcoming: number
    nextThirtyDays: number
    totalCapacity: number
}

export interface IEventListQuery {
    search?: string
    type?: string
    /** upcoming | ongoing | past */
    when?: string
    page?: number
    pageSize?: number
}

export type EventTiming = "upcoming" | "ongoing" | "past"

export const eventTiming = (event: Pick<IEvent, "startsAt" | "endsAt">, now = Date.now()): EventTiming => {
    if (new Date(event.endsAt).getTime() < now) return "past"
    if (new Date(event.startsAt).getTime() <= now) return "ongoing"
    return "upcoming"
}

export const EVENT_TIMING_BADGES: Record<EventTiming, { label: string, tone: BadgeTone }> = {
    upcoming: { label: "Upcoming", tone: "info" },
    ongoing: { label: "Happening now", tone: "success" },
    past: { label: "Past", tone: "neutral" },
}

const base = "/api/v1/events"

export const eventApi = {
    list: (query: IEventListQuery): Promise<IHTTPResponse> => apiClient.get(`${base}${toQuery({ ...query })}`),
    metrics: (): Promise<IHTTPResponse> => apiClient.get(`${base}/metrics`),
    create: (payload: IEventPayload): Promise<IHTTPResponse> => apiClient.post(base, payload),
}
