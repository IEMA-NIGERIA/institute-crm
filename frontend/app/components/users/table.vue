<template>
    <CommonDataTable
        title="Users"
        :columns="columns"
        :rows="users"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :is-loading="isLoading"
        :error="error"
        error-title="Couldn't load users"
        :empty-title="filtered ? 'No users match your filters' : 'No users yet'"
        :empty-text="filtered ? 'Try a different search or clear the filters.' : 'Staff accounts you add will appear here.'"
        :empty-icon="filtered ? 'hugeicons:search-remove' : 'hugeicons:user-multiple'"
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
        <template #row="{ row: user }">
            <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                    <div
                        class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold"
                        :class="user.isActive ? 'bg-[#103260] text-white' : 'bg-gray-200 text-gray-500'"
                    >
                        {{ initialsOf(user.firstName, user.lastName) }}
                    </div>
                    <div class="min-w-0">
                        <p class="m-0 font-medium text-gray-900">
                            {{ user.firstName }} {{ user.lastName }}
                            <CommonBadge v-if="user.id === auth.user?.id" class="ml-1">You</CommonBadge>
                        </p>
                        <p class="m-0 text-xs text-gray-500">{{ user.email }}</p>
                    </div>
                </div>
            </td>
            <td class="px-5 py-3.5 text-gray-700">{{ user.role ? roleLabel(user.role.title) : "No role" }}</td>
            <td class="px-5 py-3.5">
                <CommonBadge :tone="user.isActive ? 'success' : 'neutral'">{{ user.isActive ? "Active" : "Deactivated" }}</CommonBadge>
            </td>
            <td class="px-5 py-3.5 whitespace-nowrap" :title="user.lastLoginAt ? formatDateTime(user.lastLoginAt) : undefined">
                <span v-if="user.lastLoginAt" class="text-gray-700 first-letter:uppercase inline-block">{{ daysAgoText(user.lastLoginAt) }}</span>
                <span v-else class="text-gray-400">Never</span>
            </td>
            <td class="px-5 py-3.5 text-gray-500 whitespace-nowrap">{{ formatDate(user.createdAt) }}</td>
            <td v-if="canManage" class="px-5 py-3.5 text-right">
                <button
                    type="button"
                    @click="emit('edit', user)"
                    class="px-3 py-1.5 rounded-lg bg-transparent border-none text-sm font-medium text-[#103260] cursor-pointer hover:bg-gray-100"
                    :aria-label="`Edit ${user.firstName} ${user.lastName}`"
                >
                    Edit
                </button>
            </td>
        </template>
    </CommonDataTable>
</template>
<script setup lang="ts">
import { roleLabel, USERS_MANAGE_PERMISSION, type IStaffUser } from '~/composables/apiclient/user';
import { daysAgoText, formatDate, formatDateTime, initialsOf } from '~/composables/format';
import { useAuthStore } from '~/stores/auth';

interface IProps {
    users: IStaffUser[]
    total: number
    page: number
    pageSize: number
    isLoading?: boolean
    error?: string
    filtered?: boolean
}

withDefaults(defineProps<IProps>(), { isLoading: false, error: "", filtered: false })
const emit = defineEmits<{ retry: [], "update:page": [page: number], "clear-filters": [], edit: [user: IStaffUser] }>()

const auth = useAuthStore()
const canManage = computed(() => auth.can(USERS_MANAGE_PERMISSION))

const columns = computed(() => ["User", "Role", "Status", "Last Sign-in", "Added", ...(canManage.value ? [""] : [])])
</script>
