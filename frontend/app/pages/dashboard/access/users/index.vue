<template>
   <NuxtLayout name="dashboard-layout">
      <div class="flex flex-wrap items-center justify-between gap-3">
         <div>
            <h2 class="text-2xl">Users</h2>
            <p class="text-sm">Staff accounts that can sign in to the CRM, and the role each one holds.</p>
         </div>
         <CommonButton
            v-if="auth.can(USERS_MANAGE_PERMISSION)"
            title="New User"
            :block="false"
            @on-click="isCreating = true"
         />
      </div>

      <p v-if="notice" class="flex items-center justify-between gap-3 mt-4 mb-0 p-3 rounded-lg bg-green-50 text-green-800 text-sm" role="status">
         <span>{{ notice }}</span>
         <button type="button" aria-label="Dismiss" @click="notice = ''" class="p-1 rounded-md bg-transparent border-none text-green-800 cursor-pointer hover:bg-green-100">
            <CommonIcon icon="hugeicons:cancel-01" :size="16" />
         </button>
      </p>

      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
         <CommonMetricCard dark title="Total Users" :value="metric('total')" icon="hugeicons:user-multiple" />
         <CommonMetricCard title="Active" :value="metric('active')" icon="hugeicons:user-check-01" tone="success" />
         <CommonMetricCard title="Deactivated" :value="metric('inactive')" subtitle="Can't sign in" icon="hugeicons:user-block-01" tone="danger" />
         <CommonMetricCard
            title="Signed in, Last 30 Days"
            :value="metric('signedInLast30Days')"
            :subtitle="metrics ? `of ${metrics.active} active users` : undefined"
            icon="hugeicons:login-03"
            :progress="metrics && metrics.active ? Math.round((metrics.signedInLast30Days / metrics.active) * 100) : undefined"
         />
      </div>

      <div class="grid md:grid-cols-[2fr_1fr_1fr] gap-3 mt-6">
         <CommonSearchInput
            :model-value="state.search"
            placeholder="Search name or email"
            @update:model-value="set({ search: $event })"
         />
         <FormChoice :value="state.role" :options="roleOptions(roles)" placeholder="All roles" clearable aria-label="Role" @update:value="set({ role: $event })" />
         <FormChoice :value="state.status" :options="USER_STATUS_OPTIONS" placeholder="Any status" clearable aria-label="Status" @update:value="set({ status: $event })" />
      </div>

      <UsersTable
         class="mt-4"
         :users="users"
         :total="total"
         :page="page"
         :page-size="PAGE_SIZE"
         :is-loading="isLoading"
         :error="error"
         :filtered="isFiltered"
         @retry="load"
         @update:page="setPage"
         @clear-filters="clear"
         @edit="editing = $event"
      />

      <UsersCreateModal
         :open="isCreating"
         :roles="roles"
         @close="isCreating = false"
         @created="onCreated"
      />

      <UsersEditModal
         :open="editing !== null"
         :user="editing"
         :roles="roles"
         @close="editing = null"
         @saved="onSaved"
      />
   </NuxtLayout>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import {
   roleApi,
   roleOptions,
   userApi,
   USER_STATUS_OPTIONS,
   USERS_MANAGE_PERMISSION,
   type IRole,
   type IStaffUser,
   type IUserMetrics,
} from '~/composables/apiclient/user';
import { useAuthStore } from '~/stores/auth';

const PAGE_SIZE = 20

const auth = useAuthStore()
const { state, page, isFiltered, set, setPage, clear } = useQueryState(["search", "role", "status"] as const)

const users = ref<IStaffUser[]>([])
const total = ref(0)
const isLoading = ref(true)
const error = ref("")
const metrics = ref<IUserMetrics | null>(null)
const roles = ref<IRole[]>([])
const editing = ref<IStaffUser | null>(null)

const notice = ref("")
const isCreating = ref(false)

const metric = (key: keyof IUserMetrics) => metrics.value?.[key] ?? "—"

const load = async () => {
   isLoading.value = true
   error.value = ""
   const result = await userApi.list({ ...state.value, page: page.value, pageSize: PAGE_SIZE })
   isLoading.value = false
   if (result.statusCode !== 200) {
      error.value = apiErrorMessage(result)
      return
   }
   users.value = result.responseBody.items
   total.value = result.responseBody.total
}

const loadMetrics = async () => {
   const result = await userApi.metrics()
   if (result.statusCode === 200) metrics.value = result.responseBody
}

const loadRoles = async () => {
   const result = await roleApi.list()
   if (result.statusCode === 200) roles.value = result.responseBody.roles
}

const afterChange = (message: string) => {
   notice.value = message
   load()
   loadMetrics()
}

const onCreated = (user: IStaffUser) => {
   isCreating.value = false
   afterChange(`${user.firstName} ${user.lastName} was added.`)
}

const onSaved = (user: IStaffUser) => {
   editing.value = null
   afterChange(`${user.firstName} ${user.lastName} was updated.`)
}

watch([state, page], load)
onMounted(() => Promise.all([load(), loadMetrics(), loadRoles()]))
</script>
