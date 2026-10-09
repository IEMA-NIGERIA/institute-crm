<template>
   <NuxtLayout name="dashboard-layout">
      <div class="max-w-6xl">
         <NuxtLink to="/dashboard/tickets" class="text-sm text-gray-600 no-underline hover:text-gray-900">&larr; Back to enquiries</NuxtLink>

         <!-- Loading -->
         <div v-if="isLoading" class="mt-4" aria-busy="true">
            <div class="h-8 w-72 rounded bg-gray-100 animate-pulse" />
            <div class="h-4 w-48 mt-3 rounded bg-gray-100 animate-pulse" />
            <div class="grid lg:grid-cols-3 gap-4 mt-6">
               <div class="lg:col-span-2 h-64 rounded-2xl bg-gray-100 animate-pulse" />
               <div class="h-40 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
         </div>

         <!-- Not found / error -->
         <div v-else-if="error" class="mt-4 flex flex-col items-center gap-3 px-5 py-16 text-center rounded-2xl bg-white border-solid border-1 border-gray-200">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="notFound ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-600'">
               <CommonIcon :icon="notFound ? 'hugeicons:search-remove' : 'hugeicons:alert-circle'" :size="22" />
            </div>
            <p class="m-0 font-medium">{{ notFound ? "Enquiry not found" : "Couldn't load this enquiry" }}</p>
            <p class="m-0 text-sm text-gray-500">{{ notFound ? "It may have been removed, or the link is incorrect." : error }}</p>
            <button
               v-if="!notFound"
               type="button"
               @click="load"
               class="mt-1 px-4 py-2 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50"
            >
               Try again
            </button>
         </div>

         <!-- Details -->
         <template v-else-if="enquiry">
            <div class="mt-3">
               <div class="flex flex-wrap items-center gap-2">
                  <h2 class="m-0 text-2xl">{{ enquiry.name }}</h2>
                  <span class="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{{ enquiry.enquirerType === "organisation" ? "Organisation" : "Individual" }}</span>
                  <span class="px-2.5 py-1 rounded-full bg-blue-50 text-[#103260] text-xs font-medium">{{ labelFor(INTEREST_TYPE_OPTIONS, enquiry.interestType) }}</span>
                  <CommonBadge :tone="statusTone(enquiry.assignmentStatus)">{{ labelFor(ASSIGNMENT_STATUS_OPTIONS, enquiry.assignmentStatus) }}</CommonBadge>
               </div>
               <p class="mt-1 mb-0 text-sm text-gray-500">
                  Recorded {{ formatDate(enquiry.createdAt) }} · via {{ labelFor(ENQUIRY_SOURCE_OPTIONS, enquiry.source) }}
               </p>
            </div>

            <div class="grid lg:grid-cols-3 gap-4 mt-6 items-start">
               <div class="lg:col-span-2 space-y-4">
                  <CommonDetailList :sections="sections" />

                  <!-- Closing remark -->
                  <section v-if="enquiry.closingRemark" class="box-border p-5 rounded-2xl bg-white border-solid border-1 border-gray-200">
                     <h3 class="m-0 mb-2 text-xs font-semibold tracking-wider uppercase text-gray-500">Closing Remark</h3>
                     <p class="m-0 text-sm text-gray-900 whitespace-pre-line">{{ enquiry.closingRemark }}</p>
                  </section>
               </div>

               <div class="space-y-4">
                  <!-- Actions panel (only for users with write permission) -->
                  <section v-if="canWrite" class="box-border p-5 rounded-2xl bg-white border-solid border-1 border-gray-200">
                     <h3 class="m-0 mb-4 text-xs font-semibold tracking-wider uppercase text-gray-500">Actions</h3>
                     <div class="space-y-4">
                        <!-- Assignment -->
                        <div>
                           <label class="block text-xs text-gray-500 mb-1">Assign to</label>
                           <select
                              class="w-full rounded-lg border-solid border-1 border-gray-300 bg-white px-3 py-2 text-sm"
                              :value="enquiry.assignedToId ?? ''"
                              @change="onAssign(($event.target as HTMLSelectElement).value)"
                              :disabled="saving"
                           >
                              <option value="">Unassigned</option>
                              <option v-for="user in staffUsers" :key="user.id" :value="user.id">{{ user.firstName }} {{ user.lastName }}</option>
                           </select>
                        </div>

                        <!-- Response tag -->
                        <div>
                           <label class="block text-xs text-gray-500 mb-1">Response tag</label>
                           <select
                              class="w-full rounded-lg border-solid border-1 border-gray-300 bg-white px-3 py-2 text-sm"
                              :value="enquiry.responseTag ?? ''"
                              @change="onUpdate({ responseTag: ($event.target as HTMLSelectElement).value || null })"
                              :disabled="saving"
                           >
                              <option value="">None</option>
                              <option v-for="opt in RESPONSE_TAG_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                           </select>
                        </div>

                        <!-- Pipeline stage -->
                        <div>
                           <label class="block text-xs text-gray-500 mb-1">Pipeline stage</label>
                           <select
                              class="w-full rounded-lg border-solid border-1 border-gray-300 bg-white px-3 py-2 text-sm"
                              :value="enquiry.pipelineStage ?? ''"
                              @change="onUpdate({ pipelineStage: ($event.target as HTMLSelectElement).value || null })"
                              :disabled="saving"
                           >
                              <option value="">None</option>
                              <option v-for="opt in PIPELINE_STAGE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                           </select>
                        </div>

                        <!-- Close enquiry button -->
                        <div v-if="enquiry.assignmentStatus !== 'closed'">
                           <button
                              v-if="!showCloseForm"
                              type="button"
                              @click="showCloseForm = true"
                              class="w-full px-4 py-2 rounded-lg bg-red-50 border-solid border-1 border-red-200 text-red-700 text-sm font-medium cursor-pointer hover:bg-red-100"
                              :disabled="saving"
                           >
                              Close enquiry
                           </button>
                           <div v-else class="space-y-2">
                              <textarea
                                 v-model="closingRemark"
                                 rows="3"
                                 placeholder="Add a closing remark (required)"
                                 class="w-full box-border rounded-lg border-solid border-1 border-gray-300 px-3 py-2 text-sm resize-y"
                              />
                              <p v-if="closeError" class="m-0 text-xs text-red-600">{{ closeError }}</p>
                              <div class="flex gap-2">
                                 <button
                                    type="button"
                                    @click="onClose"
                                    class="flex-1 px-4 py-2 rounded-lg bg-red-600 border-none text-white text-sm font-medium cursor-pointer hover:bg-red-700"
                                    :disabled="saving"
                                 >
                                    Confirm close
                                 </button>
                                 <button
                                    type="button"
                                    @click="showCloseForm = false; closeError = ''"
                                    class="px-4 py-2 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50"
                                    :disabled="saving"
                                 >
                                    Cancel
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  </section>

                  <CommonMetricCard
                     dark
                     title="Estimated Value"
                     :value="enquiry.estimatedValue === null ? '—' : formatNaira(enquiry.estimatedValue)"
                     :subtitle="enquiry.estimatedValue === null ? 'No estimate recorded' : undefined"
                     icon="hugeicons:money-bag-02"
                  />
                  <section class="box-border p-5 rounded-2xl bg-white border-solid border-1 border-gray-200">
                     <h3 class="m-0 mb-4 text-xs font-semibold tracking-wider uppercase text-gray-500">Record</h3>
                     <dl class="m-0 space-y-4">
                        <div>
                           <dt class="text-xs text-gray-500">Created</dt>
                           <dd class="m-0 mt-1 text-sm text-gray-900">{{ formatDateTime(enquiry.createdAt) }}</dd>
                        </div>
                        <div>
                           <dt class="text-xs text-gray-500">Last updated</dt>
                           <dd class="m-0 mt-1 text-sm text-gray-900">{{ formatDateTime(enquiry.updatedAt) }}</dd>
                        </div>
                        <div v-if="enquiry.assignedTo">
                           <dt class="text-xs text-gray-500">Assigned to</dt>
                           <dd class="m-0 mt-1 text-sm text-gray-900">{{ enquiry.assignedTo.firstName }} {{ enquiry.assignedTo.lastName }}</dd>
                        </div>
                        <div>
                           <dt class="text-xs text-gray-500">Reference</dt>
                           <dd class="m-0 mt-1 text-xs text-gray-700 font-mono break-all">{{ enquiry.id }}</dd>
                        </div>
                     </dl>
                  </section>
               </div>
            </div>
         </template>
      </div>
   </NuxtLayout>
</template>
<script setup lang="ts">
import {
   enquiryApi,
   ASSIGNMENT_STATUS_OPTIONS,
   ENQUIRY_SOURCE_OPTIONS,
   INTEREST_TYPE_OPTIONS,
   PIPELINE_STAGE_OPTIONS,
   RESPONSE_TAG_OPTIONS,
   formatDate,
   formatNaira,
   labelFor,
   type IEnquiry,
   type IUpdateEnquiryPayload,
} from '~/composables/apiclient/enquiry';
import { userApi, type IStaffUser } from '~/composables/apiclient/user';
import type { IDetailSection } from '~/components/common/detailList.vue';
import type { BadgeTone } from '~/components/common/badge.vue';
import { formatDateTime } from '~/composables/format';
import { useAuthStore } from '~/stores/auth';

const route = useRoute()
const auth = useAuthStore()

const enquiry = ref<IEnquiry | null>(null)
const isLoading = ref(true)
const error = ref("")
const notFound = ref(false)
const saving = ref(false)
const showCloseForm = ref(false)
const closingRemark = ref("")
const closeError = ref("")
const staffUsers = ref<IStaffUser[]>([])

const canWrite = computed(() => auth.can("enquiries:write"))

const statusTone = (status: string): BadgeTone => {
   if (status === "assigned") return "info"
   if (status === "closed") return "success"
   return "neutral"
}

const sections = computed<IDetailSection[]>(() => {
   const e = enquiry.value
   if (!e) return []
   const isOrganisation = e.enquirerType === "organisation"
   return [
      {
         title: "Contact Details",
         rows: [
            { label: "Email", value: e.email, href: e.email ? `mailto:${e.email}` : undefined },
            { label: "Phone", value: e.phone, href: e.phone ? `tel:${e.phone.replace(/[^+0-9]/g, "")}` : undefined },
            ...(isOrganisation ? [] : [{ label: "Employer", value: e.employer }]),
            { label: "Sector", value: e.sector },
         ],
      },
      {
         title: "Enquiry",
         rows: [
            { label: "Interest", value: labelFor(INTEREST_TYPE_OPTIONS, e.interestType) },
            { label: "Source", value: labelFor(ENQUIRY_SOURCE_OPTIONS, e.source) },
            { label: "Pipeline stage", value: e.pipelineStage ? labelFor(PIPELINE_STAGE_OPTIONS, e.pipelineStage) : null },
            { label: "Response tag", value: e.responseTag ? labelFor(RESPONSE_TAG_OPTIONS, e.responseTag) : null },
         ],
      },
      {
         title: "Address",
         rows: [
            { label: "Address Line 1", value: e.addressLine1, wide: true },
            { label: "City", value: e.city },
            { label: "State / Province", value: e.stateProvince },
            { label: "Postal / ZIP Code", value: e.postalCode },
            { label: "Country", value: e.country },
         ],
      },
   ]
})

const load = async () => {
   isLoading.value = true
   error.value = ""
   notFound.value = false
   const result = await enquiryApi.get(String(route.params.id))
   isLoading.value = false
   if (result.statusCode !== 200) {
      notFound.value = result.statusCode === 404 || result.statusCode === 400
      error.value = result.responseBody?.message ?? result.errorMessage ?? "Something went wrong."
      return
   }
   enquiry.value = result.responseBody.enquiry
}

const loadStaff = async () => {
   const result = await userApi.list({ pageSize: 100, status: "active" })
   if (result.statusCode === 200) {
      staffUsers.value = result.responseBody.users
   }
}

const onUpdate = async (payload: IUpdateEnquiryPayload) => {
   if (!enquiry.value || saving.value) return
   saving.value = true
   const result = await enquiryApi.update(enquiry.value.id, payload)
   saving.value = false
   if (result.statusCode === 200) {
      enquiry.value = result.responseBody.enquiry
   }
}

const onAssign = (userId: string) => {
   onUpdate({ assignedToId: userId || null })
}

const onClose = async () => {
   const remark = closingRemark.value.trim()
   if (!remark) {
      closeError.value = "A remark is required to close an enquiry."
      return
   }
   closeError.value = ""
   saving.value = true
   const result = await enquiryApi.update(enquiry.value!.id, { assignmentStatus: "closed", closingRemark: remark })
   saving.value = false
   if (result.statusCode === 200) {
      enquiry.value = result.responseBody.enquiry
      showCloseForm.value = false
      closingRemark.value = ""
   } else {
      closeError.value = result.responseBody?.message ?? "Something went wrong."
   }
}

onMounted(() => {
   load()
   if (auth.can("enquiries:write")) loadStaff()
})
</script>
