<template>
   <NuxtLayout name="dashboard-layout">
      <div class="flex flex-wrap items-center justify-between gap-3">
         <div>
            <h2 class="text-2xl">Organisations</h2>
            <p class="text-sm">Corporate and institutional members, partners, and the employers of members.</p>
         </div>
         <CommonButton
            v-if="auth.can('persons:write')"
            title="New Organisation"
            :block="false"
            @on-click="isCreating = true"
         />
      </div>

      <p v-if="created" class="flex items-center justify-between gap-3 mt-4 mb-0 p-3 rounded-lg bg-green-50 text-green-800 text-sm" role="status">
         <span>
            {{ created.name }} was added.
            <NuxtLink :to="`/dashboard/organisations/${created.id}`" class="font-medium text-green-800">Open organisation</NuxtLink>
         </span>
         <button type="button" aria-label="Dismiss" @click="created = null" class="p-1 rounded-md bg-transparent border-none text-green-800 cursor-pointer hover:bg-green-100">
            <CommonIcon icon="hugeicons:cancel-01" :size="16" />
         </button>
      </p>

      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
         <CommonMetricCard dark title="Total Organisations" :value="metric('total')" icon="hugeicons:building-03" />
         <CommonMetricCard title="Corporate Members" :value="metric('corporateMembers')" icon="hugeicons:briefcase-01" tone="success" />
         <CommonMetricCard title="Institutional Members" :value="metric('institutionalMembers')" icon="hugeicons:school" tone="warning" />
         <CommonMetricCard title="Partners" :value="metric('partners')" icon="hugeicons:agreement-02" />
      </div>

      <div class="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-3 mt-6">
         <CommonSearchInput
            :model-value="state.search"
            placeholder="Search name or RC / accreditation ref."
            @update:model-value="set({ search: $event })"
         />
         <FormChoice :value="state.type" :options="ORGANISATION_TYPE_OPTIONS" placeholder="All types" clearable aria-label="Type" @update:value="set({ type: $event })" />
         <FormChoice :value="state.sector" :options="SECTOR_OPTIONS" placeholder="All sectors" clearable aria-label="Sector" @update:value="set({ sector: $event })" />
         <FormChoice :value="state.size" :options="ORGANISATION_SIZE_OPTIONS" placeholder="All sizes" clearable aria-label="Size" @update:value="set({ size: $event })" />
      </div>

      <OrganisationsTable
         class="mt-4"
         :organisations="organisations"
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

      <OrganisationsCreateModal :open="isCreating" @close="isCreating = false" @created="onCreated" />
   </NuxtLayout>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import {
   organisationApi,
   ORGANISATION_SIZE_OPTIONS,
   ORGANISATION_TYPE_OPTIONS,
   type IOrganisation,
   type IOrganisationMetrics,
} from '~/composables/apiclient/organisation';
import { SECTOR_OPTIONS } from '~/composables/referenceData';
import { useAuthStore } from '~/stores/auth';

const PAGE_SIZE = 20

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const isCreating = ref(false)
const created = ref<IOrganisation | null>(null)
const { state, page, isFiltered, set, setPage, clear } = useQueryState(["search", "type", "sector", "size"] as const)

const organisations = ref<IOrganisation[]>([])
const total = ref(0)
const isLoading = ref(true)
const error = ref("")
const metrics = ref<IOrganisationMetrics | null>(null)

const metric = (key: keyof IOrganisationMetrics) => metrics.value?.[key] ?? "—"

const load = async () => {
   isLoading.value = true
   error.value = ""
   const result = await organisationApi.list({ ...state.value, page: page.value, pageSize: PAGE_SIZE })
   isLoading.value = false
   if (result.statusCode !== 200) {
      error.value = apiErrorMessage(result)
      return
   }
   organisations.value = result.responseBody.items
   total.value = result.responseBody.total
}

const loadMetrics = async () => {
   const result = await organisationApi.metrics()
   if (result.statusCode === 200) metrics.value = result.responseBody
}

const onCreated = (organisation: IOrganisation) => {
   isCreating.value = false
   created.value = organisation
   // Newest organisations are listed first: show page 1 with no filters so it's visible (the watcher reloads).
   if (isFiltered.value || page.value !== 1) clear()
   else load()
   loadMetrics()
}

watch([state, page], load)
onMounted(() => {
   load()
   loadMetrics()
   // Links to the old /dashboard/organisations/new page arrive with ?new=1.
   if (route.query.new !== undefined) {
      isCreating.value = auth.can("persons:write")
      const { new: _new, ...query } = route.query
      router.replace({ query })
   }
})
</script>
