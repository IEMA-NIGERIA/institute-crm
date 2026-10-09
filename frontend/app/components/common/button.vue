<template>
    <button 
        :type="type"
        :disabled="isLoading || disabled"
        @click="$emit('onClick')"
        class="font-medium rounded-lg border-solid border-1 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        :class="[VARIANTS[variant], block ? 'w-full p-3 text-base' : 'px-4 py-2.5 text-sm whitespace-nowrap']">
        {{ isLoading ? loadingTitle ?? title : title }}
    </button>
</template>
<script setup lang="ts">

interface IButton {
    isLoading?: boolean
    disabled?: boolean
    title: string
    /** Shown while loading, e.g. "Saving…". */
    loadingTitle?: string
    variant?: "primary" | "secondary" | "danger"
    /** Full width. */
    block?: boolean
    type?: "button" | "submit"
}

withDefaults(defineProps<IButton>(), {
    isLoading: false,
    disabled: false,
    variant: "primary",
    block: true,
    type: "button",
})
defineEmits(["onClick"])

const VARIANTS = {
    primary: "text-white bg-[#103260] border-[#103260] hover:bg-[#0c2649]",
    secondary: "text-gray-800 bg-white border-gray-300 hover:bg-gray-50",
    danger: "text-white bg-[#C8102E] border-[#C8102E] hover:bg-[#A30F26]",
}
</script>
