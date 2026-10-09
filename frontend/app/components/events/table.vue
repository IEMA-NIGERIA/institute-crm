<template>
    <CommonDataTable
        title="Events"
        :columns="COLUMNS"
        :rows="events"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :is-loading="isLoading"
        :error="error"
        error-title="Couldn't load events"
        :empty-title="filtered ? 'No events match your filters' : 'No events yet'"
        :empty-text="filtered ? 'Try a different search or clear the filters.' : 'Training courses, workshops, seminars, conferences and award ceremonies you create will appear here.'"
        :empty-icon="filtered ? 'hugeicons:search-remove' : 'hugeicons:calendar-03'"
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
            <NuxtLink
                v-else-if="auth.can(EVENTS_MANAGE_PERMISSION)"
                to="/dashboard/events/new"
                class="mt-1 px-4 py-2 rounded-lg bg-[#103260] text-white text-sm font-medium no-underline"
            >
                New Event
            </NuxtLink>
        </template>
        <template #row="{ row: event }">
            <td class="px-5 py-3.5 min-w-60">
                <p class="m-0 font-medium text-gray-900">{{ event.title }}</p>
                <CommonBadge class="mt-1" :tone="EVENT_TYPE_TONES[event.type] ?? 'neutral'">{{ labelFor(EVENT_TYPE_OPTIONS, event.type) }}</CommonBadge>
            </td>
            <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ formatDateRange(event.startsAt, event.endsAt) }}</td>
            <td class="px-5 py-3.5 min-w-48">
                <p class="m-0 text-gray-900">{{ event.deliveryMode === "online" ? "Online" : event.venueName }}</p>
                <p v-if="event.deliveryMode === 'hybrid'" class="m-0 text-xs text-gray-500">+ online</p>
            </td>
            <td class="px-5 py-3.5 text-gray-700 tabular-nums whitespace-nowrap">{{ event.capacity === null ? "Unlimited" : event.capacity.toLocaleString() }}</td>
            <td class="px-5 py-3.5 text-gray-900 tabular-nums whitespace-nowrap">{{ formatFee(event.memberFee) }}</td>
            <td class="px-5 py-3.5 text-gray-900 tabular-nums whitespace-nowrap">{{ formatFee(event.nonMemberFee) }}</td>
            <td class="px-5 py-3.5">
                <CommonBadge :tone="EVENT_TIMING_BADGES[eventTiming(event)].tone">{{ EVENT_TIMING_BADGES[eventTiming(event)].label }}</CommonBadge>
            </td>
        </template>
    </CommonDataTable>
</template>
<script setup lang="ts">
import {
    EVENT_TIMING_BADGES,
    EVENT_TYPE_OPTIONS,
    EVENT_TYPE_TONES,
    EVENTS_MANAGE_PERMISSION,
    eventTiming,
    type IEvent,
} from '~/composables/apiclient/event';
import { formatDateRange, formatFee, labelFor } from '~/composables/format';
import { useAuthStore } from '~/stores/auth';

interface IProps {
    events: IEvent[]
    total: number
    page: number
    pageSize: number
    isLoading?: boolean
    error?: string
    filtered?: boolean
}

withDefaults(defineProps<IProps>(), { isLoading: false, error: "", filtered: false })
const emit = defineEmits<{ retry: [], "update:page": [page: number], "clear-filters": [] }>()

const auth = useAuthStore()

const COLUMNS = ["Event", "Date", "Venue", "Capacity", "Member Fee", "Non-member Fee", "Status"]
</script>
