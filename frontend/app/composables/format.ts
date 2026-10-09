export interface IOption {
    value: string
    label: string
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 })
export const formatNaira = (value: number) => naira.format(value)

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })

export const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const labelFor = (options: readonly IOption[], value: string) => options.find((o) => o.value === value)?.label ?? value

export const initialsOf = (...names: (string | null | undefined)[]) =>
    names.filter(Boolean).map((name) => name![0]!.toUpperCase()).join("").slice(0, 2)

const time = (date: Date) => date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

/** "12 Nov 2026, 09:00–17:00" for one day; "12 Nov – 14 Nov 2026" across days. */
export const formatDateRange = (startIso: string, endIso: string) => {
    const start = new Date(startIso)
    const end = new Date(endIso)
    if (start.toDateString() === end.toDateString()) return `${formatDate(startIso)}, ${time(start)}–${time(end)}`
    const sameYear = start.getFullYear() === end.getFullYear()
    const startText = start.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })
    return `${startText} – ${formatDate(endIso)}`
}

/** Naira amount, or "Free" for 0. */
export const formatFee = (value: number) => (value === 0 ? "Free" : formatNaira(value))

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

/** "today", "yesterday", "3 days ago", "2 months ago". */
export const daysAgoText = (iso: string) => {
    const days = Math.round((new Date(iso).getTime() - Date.now()) / 864e5)
    if (Math.abs(days) < 30) return relative.format(days, "day")
    if (Math.abs(days) < 365) return relative.format(Math.round(days / 30), "month")
    return relative.format(Math.round(days / 365), "year")
}
