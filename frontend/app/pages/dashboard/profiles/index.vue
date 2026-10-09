<template>
   <NuxtLayout name="dashboard-layout">
      <div class="flex flex-wrap items-center justify-between gap-3">
         <div>
            <h2 class="text-2xl">Profiles</h2>
            <p class="text-sm">Everyone IEMA works with — members, candidates, delegates and contacts — in one record each.</p>
         </div>
         <CommonButton
            v-if="auth.can('persons:write')"
            title="New Profile"
            :block="false"
            @on-click="isCreating = true"
         />
      </div>

      <p v-if="created" class="flex items-center justify-between gap-3 mt-4 mb-0 p-3 rounded-lg bg-green-50 text-green-800 text-sm" role="status">
         <span>
            {{ profileFullName(created) }} was added.
            <NuxtLink :to="`/dashboard/profiles/${created.id}`" class="font-medium text-green-800">Open profile</NuxtLink>
         </span>
         <button type="button" aria-label="Dismiss" @click="created = null" class="p-1 rounded-md bg-transparent border-none text-green-800 cursor-pointer hover:bg-green-100">
            <CommonIcon icon="hugeicons:cancel-01" :size="16" />
         </button>
      </p>

      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
         <CommonMetricCard dark title="Total Profiles" :value="metric('total')" icon="hugeicons:user-account" />
         <CommonMetricCard title="Professional Members" :value="metric('professionalMembers')" icon="hugeicons:user-check-01" tone="success" />
         <CommonMetricCard title="CPEA Candidates" :value="metric('candidates')" icon="hugeicons:mortarboard-02" tone="warning" />
         <CommonMetricCard title="Linked to an Organisation" :value="metric('linkedToOrganisation')" icon="hugeicons:building-03" />
      </div>

      <div class="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-3 mt-6">
         <CommonSearchInput
            :model-value="state.search"
            placeholder="Search name, email or phone"
            @update:model-value="set({ search: $event })"
         />
         <FormChoice
            :value="state.relationshipType"
            :options="RELATIONSHIP_TYPE_OPTIONS"
            placeholder="All relationships"
            clearable
            aria-label="Relationship"
            @update:value="set({ relationshipType: $event })"
         />
         <FormChoice
            :value="state.sector"
            :options="SECTOR_OPTIONS"
            placeholder="All sectors"
            clearable
            aria-label="Sector"
            @update:value="set({ sector: $event })"
         />
         <FormChoice
            :value="state.state"
            :options="NIGERIAN_STATE_OPTIONS"
            placeholder="All states"
            clearable
            aria-label="State"
            @update:value="set({ state: $event })"
         />
      </div>

      <ProfilesTable
         class="mt-4"
         :profiles="profiles"
         :total="total"
         :page="page"
         :page-size="PAGE_SIZE"
         :is-loading="isLoading"
         :error="error"
         :filtered="isFiltered"
         @retry="load"
         @update:page="setPage"
         @clear-filters="clear"
         @create="isCreating = true"
      />

      <ProfilesCreateModal :open="isCreating" @close="isCreating = false" @created="onCreated" />
   </NuxtLayout>
</template>
<script setup lang="ts">
import { profileApi, profileFullName, RELATIONSHIP_TYPE_OPTIONS, type IProfile, type IProfileMetrics } from '~/composables/apiclient/profile';
import { NIGERIAN_STATE_OPTIONS, SECTOR_OPTIONS } from '~/composables/referenceData';
import { useAuthStore } from '~/stores/auth';

const PAGE_SIZE = 20

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const isCreating = ref(false)
const created = ref<IProfile | null>(null)
const { state, page, isFiltered, set, setPage, clear } = useQueryState(["search", "relationshipType", "sector", "state"] as const)

const profiles = ref<IProfile[]>([])
const total = ref(0)
const isLoading = ref(true)
const error = ref("")
const metrics = ref<IProfileMetrics | null>(null)

const metric = (key: keyof IProfileMetrics) => metrics.value?.[key] ?? "—"

const load = async () => {
   isLoading.value = true
   error.value = ""
   const result = await profileApi.list({ ...state.value, page: page.value, pageSize: PAGE_SIZE })
   isLoading.value = false
   if (result.statusCode !== 200) {
      error.value = result.responseBody?.message ?? result.errorMessage ?? "Something went wrong."
      return
   }
   profiles.value = result.responseBody.items
   total.value = result.responseBody.total
}

const loadMetrics = async () => {
   const result = await profileApi.metrics()
   if (result.statusCode === 200) metrics.value = result.responseBody
}

const onCreated = (profile: IProfile) => {
   isCreating.value = false
   created.value = profile
   // Newest profiles are listed first: show page 1 with no filters so it's visible (the watcher reloads).
   if (isFiltered.value || page.value !== 1) clear()
   else load()
   loadMetrics()
}

watch([state, page], load)
onMounted(() => {
   load()
   loadMetrics()
   // Links to the old /dashboard/profiles/new page arrive with ?new=1.
   if (route.query.new !== undefined) {
      isCreating.value = auth.can("persons:write")
      const { new: _new, ...query } = route.query
      router.replace({ query })
   }
})
</script>
