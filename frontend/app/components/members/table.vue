<template>
    <CommonDataTable
        title="Members"
        :columns="COLUMNS"
        :rows="members"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :is-loading="isLoading"
        :error="error"
        error-title="Couldn't load members"
        empty-title="No members found"
        empty-text="Members will appear here once their applications are approved."
        empty-icon="hugeicons:user-group-02"
        @retry="emit('retry')"
        @update:page="emit('update:page', $event)"
    >
        <template #row="{ row: member }">
            <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                    <div class="shrink-0 w-9 h-9 rounded-full bg-[#103260] text-white flex items-center justify-center text-xs font-semibold">
                        {{ initialsOf(member.profile.firstName, member.profile.lastName) }}
                    </div>
                    <div class="min-w-0">
                        <p class="m-0 font-medium text-gray-900">{{ profileFullName(member.profile) }}</p>
                        <p class="m-0 text-xs text-gray-500">{{ member.profile.email }}</p>
                    </div>
                </div>
            </td>
            <td class="px-5 py-3.5 text-gray-900 font-mono text-xs whitespace-nowrap">{{ member.membershipNumber }}</td>
            <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ member.grade }}</td>
            <td class="px-5 py-3.5">
                <CommonBadge :tone="STATUS_TONES[member.status.toLowerCase()] ?? 'neutral'" class="capitalize">{{ member.status }}</CommonBadge>
            </td>
            <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ member.profile.mobile ?? "—" }}</td>
            <td class="px-5 py-3.5 text-gray-500 whitespace-nowrap">{{ formatDate(member.createdAt) }}</td>
        </template>
    </CommonDataTable>
</template>
<script setup lang="ts">
import type { BadgeTone } from '~/components/common/badge.vue';
import { formatDate, initialsOf } from '~/composables/format';
import type { IMember } from '~/composables/apiclient/member';
import { profileFullName } from '~/composables/apiclient/profile';

interface IProps {
    members: IMember[]
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

const COLUMNS = ["Member", "Membership No.", "Grade", "Status", "Phone", "Member Since"]

// Statuses aren't fixed by the backend yet; anything not listed gets a neutral badge.
const STATUS_TONES: Record<string, BadgeTone> = {
    active: "success",
    pending: "warning",
    lapsed: "danger",
    suspended: "danger",
}
</script>
