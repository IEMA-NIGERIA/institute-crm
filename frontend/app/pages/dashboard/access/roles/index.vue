<template>
   <NuxtLayout name="dashboard-layout">
      <div class="flex flex-wrap items-center justify-between gap-3">
         <div>
            <h2 class="text-2xl">Roles</h2>
            <p class="text-sm">Each user holds one role; a role's permissions decide what they can see and do. Open a role to change its permissions.</p>
         </div>
         <CommonButton
            v-if="auth.can(ROLES_MANAGE_PERMISSION)"
            title="New Role"
            :block="false"
            :disabled="isLoading || !!error"
            @on-click="isCreating = true"
         />
      </div>

      <p v-if="created" class="flex items-center justify-between gap-3 mt-4 mb-0 p-3 rounded-lg bg-green-50 text-green-800 text-sm" role="status">
         <span>
            “{{ roleLabel(created.title) }}” was created with {{ created.permissions.length }} permission{{ created.permissions.length === 1 ? "" : "s" }}.
            <NuxtLink :to="rolePath(created)" class="font-medium text-green-800">Open role</NuxtLink>
         </span>
         <button type="button" aria-label="Dismiss" @click="created = null" class="p-1 rounded-md bg-transparent border-none text-green-800 cursor-pointer hover:bg-green-100">
            <CommonIcon icon="hugeicons:cancel-01" :size="16" />
         </button>
      </p>

      <CommonDataTable
         class="mt-4"
         title="Roles"
         :columns="['Role', 'Permissions', '']"
         :rows="roles"
         :total="roles.length"
         :page-size="roles.length || 1"
         :is-loading="isLoading"
         :error="error"
         error-title="Couldn't load roles"
         empty-title="No roles yet"
         empty-icon="hugeicons:shield-key"
         clickable
         @retry="load"
         @row-click="navigateTo(rolePath($event))"
      >
         <template #row="{ row: role }">
            <td class="px-5 py-4 min-w-64">
               <NuxtLink :to="rolePath(role)" @click.stop class="font-medium text-gray-900 no-underline hover:underline">{{ roleLabel(role.title) }}</NuxtLink>
               <CommonBadge v-if="role.title === SYSTEM_ADMINISTRATOR_ROLE" tone="info" class="ml-2">Full access</CommonBadge>
               <p v-if="role.description" class="m-0 mt-0.5 text-xs text-gray-500">{{ role.description }}</p>
            </td>
            <td class="px-5 py-4 min-w-48">
               <p class="m-0 text-sm text-gray-900 tabular-nums">{{ role.permissions.length }} <span class="text-gray-500">of {{ catalogSize }}</span></p>
               <div class="mt-1.5 h-1.5 w-40 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                  <div class="h-full rounded-full bg-[#103260]" :style="{ width: `${Math.round((role.permissions.length / Math.max(catalogSize, 1)) * 100)}%` }" />
               </div>
            </td>
            <td class="px-5 py-4 text-right text-gray-400">
               <CommonIcon icon="hugeicons:arrow-right-01" :size="18" />
            </td>
         </template>
      </CommonDataTable>

      <RolesCreateModal
         :open="isCreating"
         :catalog="catalog"
         :roles="roles"
         @close="isCreating = false"
         @created="onCreated"
      />
   </NuxtLayout>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import { roleApi, roleLabel, ROLES_MANAGE_PERMISSION, SYSTEM_ADMINISTRATOR_ROLE, type IPermissionDefinition, type IRole } from '~/composables/apiclient/user';
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore()

const roles = ref<IRole[]>([])
const catalog = ref<IPermissionDefinition[]>([])
const catalogSize = computed(() => catalog.value.length)
const isCreating = ref(false)
const created = ref<IRole | null>(null)
const isLoading = ref(true)
const error = ref("")

const rolePath = (role: IRole) => `/dashboard/access/roles/${role.id}`

const load = async () => {
   isLoading.value = true
   error.value = ""
   const [rolesResult, catalogResult] = await Promise.all([roleApi.list(), roleApi.permissions()])
   isLoading.value = false
   const failed = [rolesResult, catalogResult].find((r) => r.statusCode !== 200)
   if (failed) {
      error.value = apiErrorMessage(failed)
      return
   }
   roles.value = rolesResult.responseBody.roles
   catalog.value = catalogResult.responseBody.permissions
}

const onCreated = (role: IRole) => {
   isCreating.value = false
   created.value = role
   load()
}

onMounted(load)
</script>
