<template>
    <div role="tablist" class="flex gap-1 overflow-x-auto border-b-solid border-b-1 border-gray-200">
        <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="tab.key === modelValue"
            @click="emit('update:modelValue', tab.key)"
            class="-mb-px flex items-center gap-2 px-4 py-2.5 bg-transparent border-none border-b-solid border-b-2 text-sm font-medium whitespace-nowrap cursor-pointer"
            :class="tab.key === modelValue ? 'border-[#C8102E] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'"
        >
            {{ tab.label }}
            <span v-if="tab.count !== undefined" class="px-1.5 py-0.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">{{ tab.count }}</span>
        </button>
    </div>
</template>
<script setup lang="ts">

export interface ITab {
    key: string
    label: string
    count?: number
}

defineProps<{ tabs: ITab[], modelValue: string }>()
const emit = defineEmits<{ "update:modelValue": [key: string] }>()
</script>
