<template>
    <CommonDataTable
        title="Organisations"
        :columns="COLUMNS"
        :rows="organisations"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :is-loading="isLoading"
        :error="error"
        error-title="Couldn't load organisations"
        :empty-title="filtered ? 'No organisations match your filters' : 'No organisations yet'"
        :empty-text="filtered ? 'Try a different search or clear the filters.' : 'Corporate members, institutions, partners and employers you add will appear here.'"
        :empty-icon="filtered ? 'hugeicons:search-remove' : 'hugeicons:building-03'"
        clickable
        @retry="emit('retry')"
        @update:page="emit('update:page', $event)"
        @row-click="navigateTo(organisationPath($event))"
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
            <CommonButton
                v-else-if="auth.can('persons:write')"
                class="mt-1"
                title="New Organisation"
                :block="false"
                @on-click="emit('create')"
            />
        </template>
        <template #row="{ row: organisation }">
            <td class="px-5 py-3.5">
                <NuxtLink :to="organisationPath(organisation)" @click.stop class="font-medium text-gray-900 no-underline hover:underline">{{ organisation.name }}</NuxtLink>
                <p v-if="organisation.website" class="m-0 text-xs text-gray-500">{{ websiteHost(organisation.website) }}</p>
            </td>
            <td class="px-5 py-3.5">
                <div class="flex flex-wrap gap-1.5">
                    <CommonBadge v-for="type in organisation.types" :key="type" :tone="ORGANISATION_TYPE_TONES[type] ?? 'neutral'">{{ labelFor(ORGANISATION_TYPE_OPTIONS, type) }}</CommonBadge>
                </div>
            </td>
            <td class="px-5 py-3.5 text-gray-700 font-mono text-xs whitespace-nowrap">{{ organisation.registrationReference ?? "—" }}</td>
            <td class="px-5 py-3.5 text-gray-700">{{ organisation.sector ?? "—" }}</td>
            <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ organisation.size ? labelFor(ORGANISATION_SIZE_OPTIONS, organisation.size) : "—" }}</td>
            <td class="px-5 py-3.5 text-gray-900 tabular-nums">{{ organisation.profileCount }}</td>
            <td class="px-5 py-3.5 text-gray-500 whitespace-nowrap">{{ formatDate(organisation.createdAt) }}</td>
        </template>
    </CommonDataTable>
</template>
<script setup lang="ts">
import { formatDate, labelFor } from '~/composables/format';
import { ORGANISATION_SIZE_OPTIONS, ORGANISATION_TYPE_OPTIONS, ORGANISATION_TYPE_TONES, websiteHost, type IOrganisation } from '~/composables/apiclient/organisation';
import { useAuthStore } from '~/stores/auth';

interface IProps {
    organisations: IOrganisation[]
    total: number
    page: number
    pageSize: number
    isLoading?: boolean
    error?: string
    filtered?: boolean
}

withDefaults(defineProps<IProps>(), { isLoading: false, error: "", filtered: false })
const emit = defineEmits<{ retry: [], "update:page": [page: number], "clear-filters": [], create: [] }>()

const auth = useAuthStore()

const COLUMNS = ["Organisation", "Types", "RC / Accreditation Ref.", "Sector", "Size", "Linked Profiles", "Added"]

const organisationPath = (organisation: IOrganisation) => `/dashboard/organisations/${organisation.id}`
</script>
