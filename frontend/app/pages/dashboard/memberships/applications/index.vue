<template>
   <NuxtLayout name="dashboard-layout">
      <div>
         <h2 class="text-2xl">Membership Applications</h2>
         <p class="text-sm">Applications move through eligibility screening to the Membership Committee for a decision.</p>
      </div>

      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
         <CommonMetricCard dark title="Total Applications" :value="metric('total')" icon="hugeicons:license-draft" />
         <CommonMetricCard
            title="Awaiting Screening"
            :value="metric('awaitingScreening')"
            subtitle="Submitted, in screening or waiting on the applicant"
            icon="hugeicons:file-search"
            tone="warning"
         />
         <CommonMetricCard title="With Committee" :value="metric('withCommittee')" subtitle="Forwarded for a decision" icon="hugeicons:user-group-02" />
         <CommonMetricCard
            title="Approved"
            :value="metric('approved')"
            :subtitle="metrics ? `${metrics.rejected} rejected · ${approvalRate}% approval rate` : undefined"
            icon="hugeicons:checkmark-circle-02"
            tone="success"
            :progress="metrics ? approvalRate : undefined"
         />
      </div>

      <div class="grid md:grid-cols-[2fr_1fr_1fr] gap-3 mt-6">
         <CommonSearchInput
            :model-value="state.search"
            placeholder="Search reference, applicant or email"
            @update:model-value="set({ search: $event })"
         />
         <FormChoice :value="state.status" :options="APPLICATION_STATUS_OPTIONS" placeholder="All statuses" clearable aria-label="Status" @update:value="set({ status: $event })" />
         <FormChoice :value="state.grade" :options="MEMBERSHIP_GRADE_OPTIONS" placeholder="All grades" clearable aria-label="Grade" @update:value="set({ grade: $event })" />
      </div>

      <ApplicationsTable
         class="mt-4"
         :applications="applications"
         :total="total"
         :page="page"
         :page-size="PAGE_SIZE"
         :is-loading="isLoading"
         :error="error"
         :filtered="isFiltered"
         @retry="load"
         @update:page="setPage"
         @clear-filters="clear"
      />
   </NuxtLayout>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import {
   applicationApi,
   APPLICATION_STATUS_OPTIONS,
   MEMBERSHIP_GRADE_OPTIONS,
   type IApplication,
   type IApplicationMetrics,
} from '~/composables/apiclient/application';

const PAGE_SIZE = 20

const { state, page, isFiltered, set, setPage, clear } = useQueryState(["search", "status", "grade"] as const)

const applications = ref<IApplication[]>([])
const total = ref(0)
const isLoading = ref(true)
const error = ref("")
const metrics = ref<IApplicationMetrics | null>(null)

const metric = (key: keyof IApplicationMetrics) => metrics.value?.[key] ?? "—"

/** Share of decided applications that were approved. */
const approvalRate = computed(() => {
   const decided = (metrics.value?.approved ?? 0) + (metrics.value?.rejected ?? 0)
   return decided ? Math.round(((metrics.value?.approved ?? 0) / decided) * 100) : 0
})

const load = async () => {
   isLoading.value = true
   error.value = ""
   const result = await applicationApi.list({ ...state.value, page: page.value, pageSize: PAGE_SIZE })
   isLoading.value = false
   if (result.statusCode !== 200) {
      error.value = apiErrorMessage(result)
      return
   }
   applications.value = result.responseBody.items
   total.value = result.responseBody.total
}

const loadMetrics = async () => {
   const result = await applicationApi.metrics()
   if (result.statusCode === 200) metrics.value = result.responseBody
}

watch([state, page], load)
onMounted(() => Promise.all([load(), loadMetrics()]))
</script>
