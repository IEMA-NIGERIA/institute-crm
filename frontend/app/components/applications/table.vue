<template>
    <CommonDataTable
        title="Applications"
        :columns="COLUMNS"
        :rows="applications"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :is-loading="isLoading"
        :error="error"
        error-title="Couldn't load applications"
        :empty-title="filtered ? 'No applications match your filters' : 'No applications yet'"
        :empty-text="filtered ? 'Try a different search or clear the filters.' : 'Membership applications will appear here once they are submitted.'"
        :empty-icon="filtered ? 'hugeicons:search-remove' : 'hugeicons:license-draft'"
        @retry="emit('retry')"
        @update:page="emit('update:page', $event)"
    >
        <template #empty-action>
            <button
                v-if="filtered"
                type="button"
                @click="emit('clear-filters')"
                class="mt-1 px-4 py-2 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50"
            >
                Clear filters
            </button>
        </template>
        <template #row="{ row: application }">
            <td class="px-5 py-3.5 font-mono text-xs text-gray-900 whitespace-nowrap">{{ application.reference }}</td>
            <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                    <div class="shrink-0 w-9 h-9 rounded-full bg-[#103260] text-white flex items-center justify-center text-xs font-semibold">
                        {{ initialsOf(application.applicant.firstName, application.applicant.lastName) }}
                    </div>
                    <div class="min-w-0">
                        <NuxtLink :to="`/dashboard/profiles/${application.applicant.id}`" class="font-medium text-gray-900 no-underline hover:underline">{{ profileFullName(application.applicant) }}</NuxtLink>
                        <p class="m-0 text-xs text-gray-500">{{ application.applicant.email }}</p>
                    </div>
                </div>
            </td>
            <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ labelFor(MEMBERSHIP_GRADE_OPTIONS, application.grade) }}</td>
            <td class="px-5 py-3.5">
                <CommonBadge :tone="APPLICATION_STATUS_TONES[application.status] ?? 'neutral'">{{ labelFor(APPLICATION_STATUS_OPTIONS, application.status) }}</CommonBadge>
            </td>
            <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ formatDate(application.submittedAt) }}</td>
            <td class="px-5 py-3.5 whitespace-nowrap">
                <template v-if="application.decidedAt">
                    <span class="text-gray-500">Decided in {{ daysBetween(application.submittedAt, application.decidedAt) }}</span>
                </template>
                <span v-else :class="waitingDays(application) >= 14 ? 'text-red-700 font-medium' : 'text-gray-700'">
                    {{ daysBetween(application.submittedAt) }}
                </span>
            </td>
        </template>
    </CommonDataTable>
</template>
<script setup lang="ts">
import {
    APPLICATION_STATUS_OPTIONS,
    APPLICATION_STATUS_TONES,
    MEMBERSHIP_GRADE_OPTIONS,
    type IApplication,
} from '~/composables/apiclient/application';
import { profileFullName } from '~/composables/apiclient/profile';
import { formatDate, initialsOf, labelFor } from '~/composables/format';

interface IProps {
    applications: IApplication[]
    total: number
    page: number
    pageSize: number
    isLoading?: boolean
    error?: string
    filtered?: boolean
}

withDefaults(defineProps<IProps>(), { isLoading: false, error: "", filtered: false })
const emit = defineEmits<{ retry: [], "update:page": [page: number], "clear-filters": [] }>()

const COLUMNS = ["Reference", "Applicant", "Grade", "Status", "Submitted", "Waiting"]

const DAY = 864e5
const waitingDays = (application: IApplication) => Math.floor((Date.now() - new Date(application.submittedAt).getTime()) / DAY)

/** "Today", "1 day", "12 days" between two moments (to now by default). */
const daysBetween = (fromIso: string, toIso?: string) => {
    const days = Math.floor(((toIso ? new Date(toIso).getTime() : Date.now()) - new Date(fromIso).getTime()) / DAY)
    return days <= 0 ? "Today" : days === 1 ? "1 day" : `${days} days`
}
</script>
