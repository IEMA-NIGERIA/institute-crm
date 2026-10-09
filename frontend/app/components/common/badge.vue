<template>
    <span class="inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap" :class="TONES[tone]">
        <slot />
    </span>
</template>
<script setup lang="ts">

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger"

withDefaults(defineProps<{ tone?: BadgeTone }>(), { tone: "neutral" })

const TONES: Record<BadgeTone, string> = {
    neutral: "bg-gray-100 text-gray-700",
    info: "bg-blue-50 text-[#103260]",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
}
</script>
