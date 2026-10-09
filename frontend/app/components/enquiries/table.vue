<template>
    <CommonDataTable
        title="Enquiries"
        :columns="COLUMNS"
        :rows="enquiries"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :is-loading="isLoading"
        :error="error"
        error-title="Couldn't load enquiries"
        empty-title="No enquiries found"
        empty-text="Enquiries you record will appear here."
        clickable
        @retry="emit('retry')"
        @update:page="emit('update:page', $event)"
        @row-click="navigateTo(detailsPath($event))"
    >
        <template #empty-action>
            <NuxtLink
                to="/dashboard/tickets/new"
                class="mt-1 px-4 py-2 rounded-lg bg-[#103260] text-white text-sm font-medium no-underline"
            >
                New Enquiry
            </NuxtLink>
        </template>
        <template #row="{ row: enquiry }">
            <td class="px-5 py-3.5">
                <NuxtLink :to="detailsPath(enquiry)" @click.stop class="font-medium text-gray-900 no-underline hover:underline">{{ enquiry.name }}</NuxtLink>
                <p class="m-0 text-xs text-gray-500">
                    {{ enquiry.enquirerType === "organisation" ? "Organisation" : "Individual" }}<template v-if="enquiry.employer"> · {{ enquiry.employer }}</template>
                </p>
            </td>
            <td class="px-5 py-3.5 text-gray-700">
                <p v-if="enquiry.email" class="m-0">{{ enquiry.email }}</p>
                <p v-if="enquiry.phone" class="m-0 text-xs text-gray-500">{{ enquiry.phone }}</p>
            </td>
            <td class="px-5 py-3.5">
                <CommonBadge :tone="statusTone(enquiry.assignmentStatus)">{{ labelFor(ASSIGNMENT_STATUS_OPTIONS, enquiry.assignmentStatus) }}</CommonBadge>
                <p v-if="enquiry.assignedTo" class="m-0 mt-1 text-xs text-gray-500">{{ enquiry.assignedTo.firstName }} {{ enquiry.assignedTo.lastName }}</p>
            </td>
            <td class="px-5 py-3.5">
                <CommonBadge v-if="enquiry.pipelineStage" :tone="pipelineTone(enquiry.pipelineStage)">{{ labelFor(PIPELINE_STAGE_OPTIONS, enquiry.pipelineStage) }}</CommonBadge>
                <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-5 py-3.5">
                <CommonBadge v-if="enquiry.responseTag" :tone="enquiry.responseTag === 'needs_response' ? 'danger' : 'warning'">{{ labelFor(RESPONSE_TAG_OPTIONS, enquiry.responseTag) }}</CommonBadge>
                <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-5 py-3.5">
                <CommonBadge tone="info">{{ labelFor(INTEREST_TYPE_OPTIONS, enquiry.interestType) }}</CommonBadge>
            </td>
            <td class="px-5 py-3.5 text-gray-500 whitespace-nowrap">{{ formatDate(enquiry.createdAt) }}</td>
        </template>
    </CommonDataTable>
</template>
<script setup lang="ts">
import {
    ASSIGNMENT_STATUS_OPTIONS,
    INTEREST_TYPE_OPTIONS,
    PIPELINE_STAGE_OPTIONS,
    RESPONSE_TAG_OPTIONS,
    type IEnquiry,
} from '~/composables/apiclient/enquiry';
import { formatDate, labelFor } from '~/composables/format';
import type { BadgeTone } from '~/components/common/badge.vue';

interface IProps {
    enquiries: IEnquiry[]
    total: number
    page: number
    pageSize: number
    isLoading?: boolean
    error?: string
}

withDefaults(defineProps<IProps>(), {
    isLoading: false,
    error: ""
})
const emit = defineEmits<{ retry: [], "update:page": [page: number] }>()

const detailsPath = (enquiry: IEnquiry) => `/dashboard/tickets/${enquiry.id}`

const COLUMNS = ["Enquirer", "Contact", "Status", "Pipeline", "Response", "Interest", "Date"]

const statusTone = (status: string): BadgeTone => {
    if (status === "assigned") return "info"
    if (status === "closed") return "success"
    return "neutral"
}

const pipelineTone = (stage: string): BadgeTone => {
    if (stage === "converted") return "success"
    if (stage === "lost") return "danger"
    if (stage === "payment_pending") return "warning"
    return "info"
}
</script>
