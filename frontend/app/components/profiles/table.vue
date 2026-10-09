<template>
    <CommonDataTable
        title="Profiles"
        :columns="COLUMNS"
        :rows="profiles"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :is-loading="isLoading"
        :error="error"
        error-title="Couldn't load profiles"
        :empty-title="filtered ? 'No profiles match your filters' : 'No profiles yet'"
        :empty-text="filtered ? 'Try a different search or clear the filters.' : 'Profiles you add will appear here.'"
        :empty-icon="filtered ? 'hugeicons:search-remove' : 'hugeicons:user-account'"
        clickable
        @retry="emit('retry')"
        @update:page="emit('update:page', $event)"
        @row-click="navigateTo(profilePath($event))"
    >
        <template #actions>
            <slot name="actions" />
        </template>
        <template #empty-action>
            <button
                v-if="filtered"
                type="button"
                @click="emit('clear-filters')"
                class="mt-1 px-4 py-2 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50"
            >
                Clear filters
            </button>
            <CommonButton
                v-else-if="auth.can('persons:write')"
                class="mt-1"
                title="New Profile"
                :block="false"
                @on-click="emit('create')"
            />
        </template>
        <template #row="{ row: profile }">
            <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                    <div class="shrink-0 w-9 h-9 rounded-full bg-[#103260] text-white flex items-center justify-center text-xs font-semibold">
                        {{ initialsOf(profile.firstName, profile.lastName) }}
                    </div>
                    <div class="min-w-0">
                        <NuxtLink :to="profilePath(profile)" @click.stop class="font-medium text-gray-900 no-underline hover:underline">{{ profileFullName(profile) }}</NuxtLink>
                        <p class="m-0 text-xs text-gray-500">{{ profile.email }}</p>
                    </div>
                </div>
            </td>
            <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ profile.mobile ?? "—" }}</td>
            <td class="px-5 py-3.5">
                <p class="m-0 text-gray-900">{{ profile.employer ?? "—" }}</p>
                <p v-if="profile.jobRole" class="m-0 text-xs text-gray-500">{{ profile.jobRole }}</p>
            </td>
            <td class="px-5 py-3.5">
                <div class="flex flex-wrap gap-1.5">
                    <CommonBadge v-for="relationship in profile.relationships.slice(0, 3)" :key="relationship.type" tone="info">
                        {{ labelFor(RELATIONSHIP_TYPE_OPTIONS, relationship.type) }}
                    </CommonBadge>
                    <CommonBadge v-if="profile.relationships.length > 3">+{{ profile.relationships.length - 3 }}</CommonBadge>
                    <span v-if="!profile.relationships.length" class="text-gray-400">—</span>
                </div>
            </td>
            <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ [profile.stateProvince, profile.country].filter(Boolean).join(", ") || "—" }}</td>
            <td class="px-5 py-3.5 text-gray-500 whitespace-nowrap">{{ formatDate(profile.createdAt) }}</td>
        </template>
    </CommonDataTable>
</template>
<script setup lang="ts">
import { formatDate, initialsOf, labelFor } from '~/composables/format';
import { profileFullName, RELATIONSHIP_TYPE_OPTIONS, type IProfile } from '~/composables/apiclient/profile';
import { useAuthStore } from '~/stores/auth';

interface IProps {
    profiles: IProfile[]
    total: number
    page: number
    pageSize: number
    isLoading?: boolean
    error?: string
    /** A search or filter is active (changes the empty state). */
    filtered?: boolean
}

withDefaults(defineProps<IProps>(), { isLoading: false, error: "", filtered: false })
const emit = defineEmits<{ retry: [], "update:page": [page: number], "clear-filters": [], create: [] }>()

const auth = useAuthStore()

const COLUMNS = ["Profile", "Phone", "Employer / Role", "Relationships", "Location", "Added"]
const profilePath = (profile: IProfile) => `/dashboard/profiles/${profile.id}`
</script>
