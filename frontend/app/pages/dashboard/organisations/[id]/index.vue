<template>
   <NuxtLayout name="dashboard-layout">
      <div class="max-w-6xl">
         <NuxtLink to="/dashboard/organisations" class="text-sm text-gray-600 no-underline hover:text-gray-900">&larr; Back to organisations</NuxtLink>

         <div class="mt-3">
            <CommonPageState resource="organisation" :is-loading="isLoading" :error="error" :not-found="notFound" @retry="load">
               <template v-if="organisation">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                     <div class="flex items-center gap-4">
                        <div class="shrink-0 w-14 h-14 rounded-xl bg-[#103260] text-white flex items-center justify-center">
                           <CommonIcon icon="hugeicons:building-03" :size="26" />
                        </div>
                        <div>
                           <h2 class="m-0 text-2xl">{{ organisation.name }}</h2>
                           <p class="m-0 mt-1 text-sm text-gray-500">
                              {{ [organisation.sector, organisation.city, organisation.stateProvince].filter(Boolean).join(" · ") || "No details recorded" }}
                           </p>
                           <div class="flex flex-wrap gap-1.5 mt-2">
                              <CommonBadge v-for="type in organisation.types" :key="type" :tone="ORGANISATION_TYPE_TONES[type] ?? 'neutral'">
                                 {{ labelFor(ORGANISATION_TYPE_OPTIONS, type) }}
                              </CommonBadge>
                           </div>
                        </div>
                     </div>
                     <div class="flex flex-wrap gap-2">
                        <a
                           v-if="organisation.website"
                           :href="organisation.website"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium text-gray-800 no-underline hover:bg-gray-50"
                        >
                           <CommonIcon icon="hugeicons:globe-02" :size="16" /> Website
                        </a>
                        <NuxtLink
                           v-if="auth.can('persons:write')"
                           :to="`/dashboard/organisations/${organisation.id}/edit`"
                           class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#103260] text-white text-sm font-medium no-underline"
                        >
                           <CommonIcon icon="hugeicons:edit-02" :size="16" /> Edit
                        </NuxtLink>
                     </div>
                  </div>

                  <CommonTabs v-model="tab" :tabs="tabs" class="mt-6" />

                  <div class="mt-5">
                     <div v-if="tab === 'overview'" class="grid lg:grid-cols-3 gap-4 items-start">
                        <CommonDetailList class="lg:col-span-2" :sections="sections" />
                        <CommonDetailList :sections="recordSection" />
                     </div>
                     <ProfilesAffiliationsPanel v-else-if="tab === 'profiles'" mode="organisation" :organisation="organisation" @changed="refresh" />
                  </div>
               </template>
            </CommonPageState>
         </div>
      </div>
   </NuxtLayout>
</template>
<script setup lang="ts">
import type { IDetailSection } from '~/components/common/detailList.vue';
import { formatDateTime, labelFor } from '~/composables/format';
import {
   organisationApi,
   ORGANISATION_SIZE_OPTIONS,
   ORGANISATION_TYPE_OPTIONS,
   ORGANISATION_TYPE_TONES,
   registrationReferenceLabel,
   websiteHost,
   type IOrganisation,
} from '~/composables/apiclient/organisation';
import { useAuthStore } from '~/stores/auth';

const route = useRoute()
const auth = useAuthStore()

const { data: organisation, isLoading, error, notFound, load, refresh } = useLoader<IOrganisation>(
   () => organisationApi.get(String(route.params.id)),
   (body) => body.organisation,
)

const tabs = computed(() => [
   { key: "overview", label: "Overview" },
   { key: "profiles", label: "Profiles", count: organisation.value?.profileCount },
])
const tab = useQueryTab(["overview", "profiles"])

const sections = computed<IDetailSection[]>(() => {
   const o = organisation.value
   if (!o) return []
   return [
      {
         title: "Registration",
         rows: [
            { label: registrationReferenceLabel(o.types), value: o.registrationReference },
            { label: "Website", value: websiteHost(o.website), href: o.website ?? undefined, external: true },
         ],
      },
      {
         title: "Profile",
         rows: [
            { label: "Sector", value: o.sector },
            { label: "Size", value: o.size && labelFor(ORGANISATION_SIZE_OPTIONS, o.size) },
         ],
      },
      {
         title: "Address",
         rows: [
            { label: "Address Line 1", value: o.addressLine1, wide: true },
            { label: "City", value: o.city },
            { label: "State / Province", value: o.stateProvince },
            { label: "Postal / ZIP Code", value: o.postalCode },
            { label: "Country", value: o.country },
         ],
      },
   ]
})

const recordSection = computed<IDetailSection[]>(() => organisation.value
   ? [{
      title: "Record",
      rows: [
         { label: "Created", value: formatDateTime(organisation.value.createdAt), wide: true },
         { label: "Last updated", value: formatDateTime(organisation.value.updatedAt), wide: true },
      ],
   }]
   : [])

onMounted(load)
</script>
