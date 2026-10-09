<template>
    <div
        class="box-border p-5 rounded-2xl flex flex-col gap-3"
        :class="dark
            ? 'bg-gradient-to-br from-[#1d3157] to-[#0b1628] text-white border-none'
            : 'bg-white text-gray-900 border-solid border-1 border-gray-200'"
    >
        <div class="flex items-start justify-between gap-3">
            <p
                class="m-0 mt-2 text-xs font-semibold tracking-wider uppercase"
                :class="dark ? 'text-slate-300' : 'text-gray-500'"
            >
                {{ title }}
            </p>
            <div
                v-if="icon"
                class="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                :class="dark ? 'bg-white/10 text-white' : TONES[tone].icon"
            >
                <CommonIcon :icon="icon" :size="18" />
            </div>
        </div>

        <p class="m-0 text-3xl font-bold tabular-nums leading-none">
            {{ displayValue }}
            <span v-if="suffix" class="text-sm font-medium" :class="dark ? 'text-slate-300' : 'text-gray-500'">{{ suffix }}</span>
        </p>

        <p v-if="subtitle" class="m-0 text-sm" :class="dark ? 'text-slate-300' : 'text-gray-500'">{{ subtitle }}</p>

        <div
            v-if="progress !== undefined"
            class="mt-2 h-1.5 rounded-full overflow-hidden"
            :class="dark ? 'bg-white/10' : 'bg-gray-100'"
            role="progressbar"
            :aria-valuenow="clampedProgress"
            aria-valuemin="0"
            aria-valuemax="100"
        >
            <div class="h-full rounded-full" :class="dark ? 'bg-white' : TONES[tone].bar" :style="{ width: `${clampedProgress}%` }" />
        </div>
    </div>
</template>
<script setup lang="ts">

type Tone = "neutral" | "success" | "warning" | "danger"

interface IMetricCard {
    title: string
    value: string | number
    /** Smaller text right after the value, e.g. "of 20". */
    suffix?: string
    subtitle?: string
    icon?: string
    /** Colour of the icon badge and progress bar. */
    tone?: Tone
    /** 0–100. The bar is hidden when not set. */
    progress?: number
    /** Navy highlight card, for the headline metric. */
    dark?: boolean
}

const props = withDefaults(defineProps<IMetricCard>(), {
    tone: "neutral",
    dark: false
})

const TONES: Record<Tone, { icon: string, bar: string }> = {
    neutral: { icon: "bg-gray-100 text-gray-600", bar: "bg-[#103260]" },
    success: { icon: "bg-green-50 text-green-600", bar: "bg-green-500" },
    warning: { icon: "bg-amber-50 text-amber-500", bar: "bg-amber-400" },
    danger: { icon: "bg-red-50 text-red-600", bar: "bg-red-500" },
}

// Numbers get thousands separators (e.g. 12500 -> 12,500); strings are shown as given.
const displayValue = computed(() => typeof props.value === "number" ? props.value.toLocaleString() : props.value)

const clampedProgress = computed(() => Math.min(100, Math.max(0, props.progress ?? 0)))
</script>
