<template>
   <NuxtLayout name="dashboard-layout">
      <div class="max-w-5xl">
         <NuxtLink to="/dashboard/access/roles" class="text-sm text-gray-600 no-underline hover:text-gray-900">&larr; Back to roles</NuxtLink>

         <div class="mt-3">
            <CommonPageState resource="role" :is-loading="isLoading" :error="error" :not-found="notFound" @retry="load">
               <template v-if="role">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                     <div>
                        <h2 class="m-0 text-2xl">{{ roleLabel(role.title) }}</h2>
                        <p v-if="role.description" class="m-0 mt-1 text-sm text-gray-600">{{ role.description }}</p>
                     </div>
                     <div class="text-right">
                        <p class="m-0 text-2xl font-bold tabular-nums">{{ selected.size }} <span class="text-base font-medium text-gray-500">of {{ catalog.length }}</span></p>
                        <p class="m-0 text-xs text-gray-500">permissions granted</p>
                     </div>
                  </div>

                  <p v-if="notice" class="flex items-center justify-between gap-3 mt-4 mb-0 p-3 rounded-lg bg-green-50 text-green-800 text-sm" role="status">
                     <span>{{ notice }}</span>
                     <button type="button" aria-label="Dismiss" @click="notice = ''" class="p-1 rounded-md bg-transparent border-none text-green-800 cursor-pointer hover:bg-green-100">
                        <CommonIcon icon="hugeicons:cancel-01" :size="16" />
                     </button>
                  </p>
                  <p v-if="isLocked" class="flex items-start gap-2 mt-4 mb-0 p-3 rounded-lg bg-blue-50 text-[#103260] text-sm">
                     <CommonIcon icon="hugeicons:square-lock-02" :size="18" class="shrink-0" />
                     The system administrator role always has every permission, so it can't be edited.
                  </p>

                  <div class="flex flex-wrap items-center justify-between gap-3 mt-5">
                     <CommonSearchInput v-model="search" placeholder="Search permissions" :debounce-ms="150" class="w-full sm:w-80" />
                     <p class="m-0 text-xs text-gray-500">Changes apply to everyone with this role.</p>
                  </div>

                  <div class="space-y-4 mt-4">
                     <RolesPermissionArea
                        v-for="area in visibleAreas"
                        :key="area.key"
                        :area="area"
                        :selected="selected"
                        :saved="saved"
                        :editable="!isLocked"
                        @toggle="toggle"
                        @set-all="setAll"
                     />
                  </div>
                  <p v-if="!visibleAreas.length" class="mt-6 text-sm text-gray-500 text-center">No permissions match “{{ search }}”.</p>

                  <!-- Save bar -->
                  <div v-if="isDirty" class="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0F1B2D] text-white shadow-xl">
                     <p class="m-0 text-sm"><span class="font-semibold">Unsaved changes:</span> {{ changeSummary }}</p>
                     <div class="flex gap-2">
                        <button type="button" @click="discard" class="px-4 py-2 rounded-lg bg-transparent border-solid border-1 border-white/30 text-white text-sm font-medium cursor-pointer hover:bg-white/10">Discard</button>
                        <button type="button" @click="confirming = true" class="px-4 py-2 rounded-lg bg-white border-none text-[#0F1B2D] text-sm font-semibold cursor-pointer hover:bg-gray-100">Save changes</button>
                     </div>
                  </div>
               </template>
            </CommonPageState>
         </div>
      </div>

      <CommonConfirmDialog
         :open="confirming"
         title="Save permission changes?"
         :message="confirmMessage"
         confirm-label="Save changes"
         :danger="losesOwnAccess"
         :is-loading="isSaving"
         :error="saveError"
         @close="confirming = false"
         @confirm="save"
      />
   </NuxtLayout>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import {
   groupPermissions,
   roleApi,
   roleLabel,
   ROLES_MANAGE_PERMISSION,
   SYSTEM_ADMINISTRATOR_ROLE,
   type IPermissionDefinition,
   type IRole,
} from '~/composables/apiclient/user';
import { useAuthStore } from '~/stores/auth';

const route = useRoute()
const auth = useAuthStore()

const role = ref<IRole | null>(null)
const catalog = ref<IPermissionDefinition[]>([])
const isLoading = ref(true)
const error = ref("")
const notFound = ref(false)

/** What the server has, and what's ticked on screen. */
const saved = ref(new Set<string>())
const selected = ref(new Set<string>())

const search = ref("")
const notice = ref("")
const confirming = ref(false)
const isSaving = ref(false)
const saveError = ref("")

const isLocked = computed(() => role.value?.title === SYSTEM_ADMINISTRATOR_ROLE || !auth.can(ROLES_MANAGE_PERMISSION))
const added = computed(() => [...selected.value].filter((k) => !saved.value.has(k)))
const removed = computed(() => [...saved.value].filter((k) => !selected.value.has(k)))
const changeSummary = computed(() => [
   added.value.length ? `${added.value.length} to add` : "",
   removed.value.length ? `${removed.value.length} to remove` : "",
].filter(Boolean).join(" · "))
const isDirty = computed(() => added.value.length > 0 || removed.value.length > 0)

const visibleAreas = computed(() => {
   const term = search.value.toLowerCase()
   const matches = term
      ? catalog.value.filter((p) => p.key.toLowerCase().includes(term) || p.description.toLowerCase().includes(term))
      : catalog.value
   return groupPermissions(matches)
})

const isOwnRole = computed(() => !!role.value && auth.user?.role?.id === role.value.id)
// Removing roles:manage from your own role would lock you out of this page.
const losesOwnAccess = computed(() => isOwnRole.value && removed.value.includes(ROLES_MANAGE_PERMISSION))

const confirmMessage = computed(() => {
   const parts = [
      added.value.length ? `add ${added.value.length} permission${added.value.length === 1 ? "" : "s"}` : "",
      removed.value.length ? `remove ${removed.value.length}` : "",
   ].filter(Boolean).join(" and ")
   const name = role.value ? roleLabel(role.value.title) : "this role"
   let message = `This will ${parts} for ${name}, affecting everyone with this role.`
   if (losesOwnAccess.value) message += " This is your own role: you'll lose access to roles and permissions, and only another administrator can give it back."
   else if (isOwnRole.value) message += " This is your own role, so your access changes too."
   return message
})

const toggle = (key: string, granted: boolean) => {
   const next = new Set(selected.value)
   if (granted) next.add(key)
   else next.delete(key)
   selected.value = next
}

const setAll = (keys: string[], granted: boolean) => {
   const next = new Set(selected.value)
   for (const key of keys) {
      if (granted) next.add(key)
      else next.delete(key)
   }
   selected.value = next
}

const discard = () => { selected.value = new Set(saved.value) }

const load = async () => {
   isLoading.value = true
   error.value = ""
   notFound.value = false
   // There's no single-role endpoint; the list is small.
   const [rolesResult, catalogResult] = await Promise.all([roleApi.list(), roleApi.permissions()])
   isLoading.value = false
   const failed = [rolesResult, catalogResult].find((r) => r.statusCode !== 200)
   if (failed) {
      error.value = apiErrorMessage(failed)
      return
   }
   catalog.value = catalogResult.responseBody.permissions
   role.value = (rolesResult.responseBody.roles as IRole[]).find((r) => r.id === route.params.id) ?? null
   if (!role.value) {
      notFound.value = true
      error.value = "role not found"
      return
   }
   // A locked (system administrator) role is shown with everything ticked.
   const keys = role.value.title === SYSTEM_ADMINISTRATOR_ROLE ? catalog.value.map((p) => p.key) : role.value.permissions
   saved.value = new Set(keys)
   selected.value = new Set(keys)
}

const save = async () => {
   if (!role.value) return
   isSaving.value = true
   saveError.value = ""
   const result = await roleApi.updatePermissions(role.value.id, [...selected.value])
   isSaving.value = false
   if (result.statusCode !== 200) {
      saveError.value = apiErrorMessage(result, "Could not save the permissions.")
      return
   }
   confirming.value = false
   role.value = result.responseBody.role
   saved.value = new Set(role.value!.permissions)
   selected.value = new Set(role.value!.permissions)
   notice.value = "Permissions saved."
   if (isOwnRole.value) {
      await auth.refresh()
      if (!auth.can(ROLES_MANAGE_PERMISSION)) await navigateTo("/dashboard")
   }
}

// Don't lose unsaved ticks by navigating away or closing the tab.
onBeforeRouteLeave(() => {
   if (isDirty.value && !window.confirm("You have unsaved permission changes. Leave without saving?")) return false
})
const warnOnUnload = (event: BeforeUnloadEvent) => {
   if (isDirty.value) event.preventDefault()
}
onMounted(() => {
   window.addEventListener("beforeunload", warnOnUnload)
   load()
})
onBeforeUnmount(() => window.removeEventListener("beforeunload", warnOnUnload))
</script>
