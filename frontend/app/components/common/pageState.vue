<template>
    <!-- Loading -->
    <div v-if="isLoading" aria-busy="true">
        <div class="h-8 w-72 rounded bg-gray-100 animate-pulse" />
        <div class="h-4 w-48 mt-3 rounded bg-gray-100 animate-pulse" />
        <div class="grid lg:grid-cols-3 gap-4 mt-6">
            <div class="lg:col-span-2 h-64 rounded-2xl bg-gray-100 animate-pulse" />
            <div class="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
    </div>

    <!-- Not found / error -->
    <div v-else-if="error" class="flex flex-col items-center gap-3 px-5 py-16 text-center rounded-2xl bg-white border-solid border-1 border-gray-200">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="notFound ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-600'">
            <CommonIcon :icon="notFound ? 'hugeicons:search-remove' : 'hugeicons:alert-circle'" :size="22" />
        </div>
        <p class="m-0 font-medium">{{ notFound ? `${capitalised} not found` : `Couldn't load this ${resource}` }}</p>
        <p class="m-0 text-sm text-gray-500">{{ notFound ? "It may have been removed, or the link is incorrect." : error }}</p>
        <button
            v-if="!notFound"
            type="button"
            @click="emit('retry')"
            class="mt-1 px-4 py-2 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50"
        >
            Try again
        </button>
    </div>

    <slot v-else />
</template>
<script setup lang="ts">

/** Loading / not-found / error states for a single-record page; renders the slot once loaded. */
const props = defineProps<{ isLoading: boolean, error: string, notFound: boolean, resource: string }>()
const emit = defineEmits<{ retry: [] }>()

const capitalised = computed(() => props.resource[0]!.toUpperCase() + props.resource.slice(1))
</script>
