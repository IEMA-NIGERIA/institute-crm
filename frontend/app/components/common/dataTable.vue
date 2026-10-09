<template>
    <div class="box-border rounded-2xl bg-white border-solid border-1 border-gray-200 overflow-hidden">
        <div v-if="title || $slots.actions" class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div v-if="title" class="flex items-center gap-2">
                <h3 class="m-0 text-base font-semibold">{{ title }}</h3>
                <span class="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">{{ total }}</span>
            </div>
            <slot name="actions" />
        </div>

        <!-- Error -->
        <div v-if="error && !isLoading" class="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <div class="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <CommonIcon icon="hugeicons:alert-circle" :size="22" />
            </div>
            <p class="m-0 font-medium">{{ errorTitle }}</p>
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
        <div v-else-if="!isLoading && rows.length === 0" class="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <div class="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                <CommonIcon :icon="emptyIcon" :size="22" />
            </div>
            <p class="m-0 font-medium">{{ emptyTitle }}</p>
            <p v-if="emptyText" class="m-0 text-sm text-gray-500">{{ emptyText }}</p>
            <slot name="empty-action" />
        </div>

        <!-- Loading + rows -->
        <div v-else class="overflow-x-auto">
            <table class="w-full border-collapse text-sm text-left">
                <thead>
                    <tr class="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                        <th v-for="column in columns" :key="column" class="px-5 py-3 font-semibold whitespace-nowrap">{{ column }}</th>
                    </tr>
                </thead>
                <tbody v-if="isLoading" aria-busy="true">
                    <tr v-for="row in Math.min(pageSize, 5)" :key="row" class="border-t-solid border-t-1 border-gray-100">
                        <td v-for="column in columns" :key="column" class="px-5 py-4">
                            <div class="h-3.5 w-24 rounded bg-gray-100 animate-pulse" />
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr
                        v-for="row in rows"
                        :key="row.id"
                        @click="emit('row-click', row)"
                        class="border-t-solid border-t-1 border-gray-100 hover:bg-gray-50"
                        :class="{ 'cursor-pointer': clickable }"
                    >
                        <slot name="row" :row="row" />
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div v-if="!error && total > pageSize" class="flex items-center justify-between gap-3 px-5 py-3 border-t-solid border-t-1 border-gray-100 text-sm text-gray-500">
            <span>Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }} of {{ total }}</span>
            <div class="flex gap-2">
                <button
                    v-for="nav in [{ label: 'Previous', page: page - 1 }, { label: 'Next', page: page + 1 }]"
                    :key="nav.label"
                    type="button"
                    :disabled="isLoading || nav.page < 1 || nav.page > Math.ceil(total / pageSize)"
                    @click="emit('update:page', nav.page)"
                    class="px-3 py-1.5 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {{ nav.label }}
                </button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts" generic="T extends { id: string }">

/**
 * Card-wrapped table with loading, error, empty and pagination states.
 * Each row's cells come from the `row` slot, e.g. `<template #row="{ row }"><td>…</td></template>`.
 */
interface IProps {
    columns: string[]
    rows: T[]
    total: number
    page?: number
    pageSize?: number
    title?: string
    isLoading?: boolean
    error?: string
    errorTitle?: string
    emptyTitle?: string
    emptyText?: string
    emptyIcon?: string
    /** Show a pointer on rows (pair with @row-click). */
    clickable?: boolean
}

withDefaults(defineProps<IProps>(), {
    page: 1,
    pageSize: 20,
    isLoading: false,
    error: "",
    errorTitle: "Couldn't load this list",
    emptyTitle: "Nothing here yet",
    emptyIcon: "hugeicons:inbox",
    clickable: false,
})

const emit = defineEmits<{ retry: [], "update:page": [page: number], "row-click": [row: T] }>()

defineSlots<{
    row(props: { row: T }): any
    actions?(): any
    "empty-action"?(): any
}>()
</script>
