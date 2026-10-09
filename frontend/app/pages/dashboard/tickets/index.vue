<template>
   <NuxtLayout name="dashboard-layout">
      <div class="">
          <div class="flex items-center justify-between">
            <div class="">
               <h2 class="text-2xl">Enquiries</h2>
               <p class="text-sm">Manage enquiries for membership, certification, and partnership pipelines.</p>
            </div>
            <CommonButton
               v-if="auth.can(ENQUIRIES_WRITE_PERMISSION)"
               title="New Enquiry"
               :block="false"
               @on-click="isCreating = true"
            />
         </div>

         <p v-if="created" class="flex items-center justify-between gap-3 mt-4 mb-0 p-3 rounded-lg bg-green-50 text-green-800 text-sm" role="status">
            <span>
               Enquiry for {{ created.name }} created.
               <NuxtLink :to="`/dashboard/tickets/${created.id}`" class="font-medium text-green-800">View enquiry</NuxtLink>
            </span>
            <button type="button" aria-label="Dismiss" @click="created = null" class="p-1 rounded-md bg-transparent border-none text-green-800 cursor-pointer hover:bg-green-100">
               <CommonIcon icon="hugeicons:cancel-01" :size="16" />
            </button>
         </p>
          <div class="grid sm:grid-cols-3 gap-4 mt-4">
            <CommonMetricCard
               dark
               title="Total Enquiries"
               :value="metricsError ? '—' : metrics.total"
               icon="hugeicons:tickets"
            />
            <CommonMetricCard
               title="Unassigned"
               :value="metricsError ? '—' : metrics.unassigned"
               icon="hugeicons:clock-01"
               tone="warning"
            />
            <CommonMetricCard
               title="Closed"
               :value="metricsError ? '—' : metrics.closed"
               icon="hugeicons:checkmark-circle-02"
               tone="success"
            />
         </div>

         <!-- Filters -->
         <div class="flex flex-wrap gap-3 mt-4">
            <select v-model="filters.assignmentStatus" @change="onFilter" class="rounded-lg border-solid border-1 border-gray-300 bg-white px-3 py-2 text-sm">
               <option value="">All statuses</option>
               <option v-for="opt in ASSIGNMENT_STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <select v-model="filters.pipelineStage" @change="onFilter" class="rounded-lg border-solid border-1 border-gray-300 bg-white px-3 py-2 text-sm">
               <option value="">All pipeline stages</option>
               <option v-for="opt in PIPELINE_STAGE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <select v-model="filters.responseTag" @change="onFilter" class="rounded-lg border-solid border-1 border-gray-300 bg-white px-3 py-2 text-sm">
               <option value="">All response tags</option>
               <option v-for="opt in RESPONSE_TAG_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
         </div>

         <EnquiriesTable
            class="mt-4"
            :enquiries="enquiries"
            :total="total"
            :page="page"
            :page-size="PAGE_SIZE"
            :is-loading="isLoading"
            :error="error"
            @retry="load"
            @update:page="page = $event"
         />

         <EnquiriesCreateModal
            :open="isCreating"
            @close="isCreating = false"
            @created="onCreated"
         />
      </div>
   </NuxtLayout>
</template>
<script setup lang="ts">
import {
   enquiryApi,
   ASSIGNMENT_STATUS_OPTIONS,
   PIPELINE_STAGE_OPTIONS,
   RESPONSE_TAG_OPTIONS,
   type IEnquiry,
   type IEnquiryMetrics,
} from '~/composables/apiclient/enquiry';
import { useAuthStore } from '~/stores/auth';

const PAGE_SIZE = 20
const ENQUIRIES_WRITE_PERMISSION = "enquiries:write"

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const isCreating = ref(false)
const created = ref<IEnquiry | null>(null)

const enquiries = ref<IEnquiry[]>([])
const total = ref(0)
const page = ref(1)
const isLoading = ref(true)
const error = ref("")

const metrics = ref<IEnquiryMetrics>({ total: 0, unassigned: 0, assigned: 0, closed: 0 })
const metricsError = ref(false)

const filters = reactive({
   assignmentStatus: "",
   pipelineStage: "",
   responseTag: "",
})

const load = async () => {
   isLoading.value = true
   error.value = ""
   const result = await enquiryApi.list(page.value, PAGE_SIZE, { ...filters })
   isLoading.value = false
   if (result.statusCode !== 200) {
      error.value = result.responseBody?.message ?? result.errorMessage ?? "Something went wrong."
      return
   }
   enquiries.value = result.responseBody.enquiries
   total.value = result.responseBody.total
}

const loadMetrics = async () => {
   const result = await enquiryApi.metrics()
   if (result.statusCode === 200) {
      metrics.value = result.responseBody
      metricsError.value = false
   } else {
      metricsError.value = true
   }
}

const onFilter = () => {
   page.value = 1
   load()
}

const onCreated = (enquiry: IEnquiry) => {
   isCreating.value = false
   created.value = enquiry
   loadMetrics()
   if (page.value !== 1) page.value = 1
   else load()
}

watch(page, load)
onMounted(() => {
   load()
   loadMetrics()
   if (route.query.new !== undefined) {
      isCreating.value = auth.can(ENQUIRIES_WRITE_PERMISSION)
      const { new: _new, ...query } = route.query
      router.replace({ query })
   }
})
</script>
