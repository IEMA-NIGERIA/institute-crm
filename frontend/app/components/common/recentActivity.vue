<template>
    <div class="box-border rounded-2xl bg-white border-solid border-1 border-gray-200 overflow-hidden">
        <div class="flex items-center justify-between gap-2 px-5 py-4">
            <h3 class="m-0 text-base font-semibold">{{ title }}</h3>
            <NuxtLink v-if="viewAllTo && activities.length" :to="viewAllTo" class="text-sm font-medium text-[#103260] no-underline hover:underline">View all</NuxtLink>
        </div>

        <!-- Loading -->
        <ul v-if="isLoading" class="m-0 px-5 pb-5 list-none space-y-5" aria-busy="true">
            <li v-for="row in 4" :key="row" class="flex gap-3">
                <div class="shrink-0 w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                <div class="flex-1 space-y-2 pt-1">
                    <div class="h-3.5 w-3/4 rounded bg-gray-100 animate-pulse" />
                    <div class="h-3 w-20 rounded bg-gray-100 animate-pulse" />
                </div>
            </li>
        </ul>

        <!-- Error -->
        <div v-else-if="error" class="flex flex-col items-center gap-3 px-5 pt-6 pb-10 text-center">
            <div class="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <CommonIcon icon="hugeicons:alert-circle" :size="22" />
            </div>
            <p class="m-0 font-medium">Couldn't load activity</p>
            <p class="m-0 text-sm text-gray-500">{{ error }}</p>
            <button
                type="button"
                @click="emit('retry')"
                class="mt-1 px-4 py-2 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50"
            >
                Try again
            </button>
        </div>

        <!-- Empty -->
        <div v-else-if="activities.length === 0" class="flex flex-col items-center gap-3 px-5 pt-6 pb-10 text-center">
            <div class="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                <CommonIcon icon="hugeicons:clock-01" :size="22" />
            </div>
            <p class="m-0 font-medium">No recent activity</p>
            <p class="m-0 text-sm text-gray-500">Actions taken in the system will appear here.</p>
        </div>

        <!-- Timeline -->
        <ol v-else class="m-0 px-5 pb-5 list-none">
            <li v-for="(activity, idx) in activities" :key="activity.id" class="relative flex gap-3 pb-5 last:pb-0">
                <!-- Connector line between entries -->
                <span v-if="idx < activities.length - 1" class="absolute left-[17px] top-10 bottom-1 w-px bg-gray-200" aria-hidden="true" />

                <div
                    class="relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                    :class="TONES[activity.tone ?? 'neutral']"
                >
                    <CommonIcon v-if="activity.icon" :icon="activity.icon" :size="16" />
                    <span v-else>{{ initials(activity.actor) }}</span>
                </div>

                <div class="min-w-0 pt-0.5">
                    <p class="m-0 text-sm text-gray-700 leading-snug">
                        <span class="font-semibold text-gray-900">{{ activity.actor ?? "System" }}</span>
                        {{ activity.description }}
                    </p>
                    <time :datetime="activity.createdAt" :title="new Date(activity.createdAt).toLocaleString()" class="text-xs text-gray-500">
                        {{ timeAgo(activity.createdAt) }}
                    </time>
                </div>
            </li>
        </ol>
    </div>
</template>
<script setup lang="ts">

export type ActivityTone = "neutral" | "success" | "warning" | "danger" | "info"

export interface IActivity {
    id: string
    /** Who did it; null for system actions. */
    actor: string | null
    /** Reads after the actor's name, e.g. "created an enquiry for Dangote Group". */
    description: string
    /** ISO timestamp. */
    createdAt: string
    /** Shown instead of the actor's initials. */
    icon?: string
    tone?: ActivityTone
}

interface IProps {
    activities: IActivity[]
    title?: string
    isLoading?: boolean
    error?: string
    viewAllTo?: string
}

withDefaults(defineProps<IProps>(), {
    title: "Recent Activity",
    isLoading: false,
    error: ""
})
const emit = defineEmits<{ retry: [] }>()

const TONES: Record<ActivityTone, string> = {
    neutral: "bg-[#103260] text-white",
    info: "bg-blue-50 text-blue-600",
    success: "bg-green-50 text-green-600",
    warning: "bg-amber-50 text-amber-500",
    danger: "bg-red-50 text-red-600",
}

const initials = (name: string | null) =>
    (name ?? "System").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("")

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31_536_000], ["month", 2_592_000], ["week", 604_800], ["day", 86_400], ["hour", 3_600], ["minute", 60]]

/** "just now", "5 minutes ago", "yesterday", ... */
const timeAgo = (iso: string) => {
    const seconds = (new Date(iso).getTime() - Date.now()) / 1000
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
    }
    return "just now"
}
</script>
