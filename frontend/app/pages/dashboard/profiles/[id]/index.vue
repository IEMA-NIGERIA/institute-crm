<template>
   <NuxtLayout name="dashboard-layout">
      <div class="max-w-6xl">
         <NuxtLink to="/dashboard/profiles" class="text-sm text-gray-600 no-underline hover:text-gray-900">&larr; Back to profiles</NuxtLink>

         <div class="mt-3">
            <CommonPageState resource="profile" :is-loading="isLoading" :error="error" :not-found="notFound" @retry="load">
               <template v-if="profile">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                     <div class="flex items-center gap-4">
                        <div class="shrink-0 w-14 h-14 rounded-full bg-[#103260] text-white flex items-center justify-center text-lg font-semibold">
                           {{ initialsOf(profile.firstName, profile.lastName) }}
                        </div>
                        <div>
                           <h2 class="m-0 text-2xl">{{ profileFullName(profile) }}</h2>
                           <p class="m-0 mt-1 text-sm text-gray-500">
                              {{ [profile.jobRole, profile.employer].filter(Boolean).join(" · ") || "No job details recorded" }}
                           </p>
                           <div v-if="profile.relationships.length" class="flex flex-wrap gap-1.5 mt-2">
                              <CommonBadge v-for="relationship in profile.relationships" :key="relationship.type" tone="info">
                                 {{ labelFor(RELATIONSHIP_TYPE_OPTIONS, relationship.type) }}
                              </CommonBadge>
                           </div>
                        </div>
                     </div>
                     <div class="flex flex-wrap gap-2">
                        <a :href="`mailto:${profile.email}`" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium text-gray-800 no-underline hover:bg-gray-50">
                           <CommonIcon icon="hugeicons:mail-01" :size="16" /> Email
                        </a>
                        <a v-if="profile.mobile" :href="`tel:${profile.mobile.replace(/[^+0-9]/g, '')}`" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium text-gray-800 no-underline hover:bg-gray-50">
                           <CommonIcon icon="hugeicons:call" :size="16" /> Call
                        </a>
                        <NuxtLink
                           v-if="auth.can('persons:write')"
                           :to="`/dashboard/profiles/${profile.id}/edit`"
                           class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#103260] text-white text-sm font-medium no-underline"
                        >
                           <CommonIcon icon="hugeicons:edit-02" :size="16" /> Edit
                        </NuxtLink>
                     </div>
                  </div>

                  <CommonTabs v-model="tab" :tabs="TABS" class="mt-6" />

                  <div class="mt-5">
                     <div v-if="tab === 'overview'" class="grid lg:grid-cols-3 gap-4 items-start">
                        <CommonDetailList class="lg:col-span-2" :sections="sections" />
                        <CommonDetailList :sections="recordSection" />
                     </div>
                     <ProfilesRelationshipsPanel v-else-if="tab === 'relationships'" :profile-id="profile.id" @changed="refresh" />
                     <ProfilesAffiliationsPanel v-else-if="tab === 'organisations'" mode="profile" :profile="profile" />
                     <ProfilesDocumentsPanel v-else-if="tab === 'documents'" :profile-id="profile.id" />
                  </div>
               </template>
            </CommonPageState>
         </div>
      </div>
   </NuxtLayout>
</template>
<script setup lang="ts">
import type { IDetailSection } from '~/components/common/detailList.vue';
import { formatDateTime, initialsOf, labelFor } from '~/composables/format';
import {
   profileApi,
   profileFullName,
   QUALIFICATION_OPTIONS,
   RELATIONSHIP_TYPE_OPTIONS,
   type IProfile,
} from '~/composables/apiclient/profile';
import { useAuthStore } from '~/stores/auth';

const TABS = [
   { key: "overview", label: "Overview" },
   { key: "relationships", label: "Relationships" },
   { key: "organisations", label: "Organisations" },
   { key: "documents", label: "Documents" },
]

const route = useRoute()
const auth = useAuthStore()
const tab = useQueryTab(TABS.map((t) => t.key))

const { data: profile, isLoading, error, notFound, load, refresh } = useLoader<IProfile>(
   () => profileApi.get(String(route.params.id)),
   (body) => body.profile,
)

const sections = computed<IDetailSection[]>(() => {
   const p = profile.value
   if (!p) return []
   return [
      {
         title: "Contact",
         rows: [
            { label: "Email", value: p.email, href: `mailto:${p.email}` },
            { label: "Phone", value: p.mobile, href: p.mobile ? `tel:${p.mobile.replace(/[^+0-9]/g, "")}` : undefined },
         ],
      },
      {
         title: "Professional",
         rows: [
            { label: "Employer", value: p.employer },
            { label: "Job role", value: p.jobRole },
            { label: "Sector", value: p.sector },
            { label: "Highest qualification", value: p.highestQualification && labelFor(QUALIFICATION_OPTIONS, p.highestQualification) },
            { label: "Years of experience", value: p.yearsOfExperience },
         ],
      },
      {
         title: "Location",
         rows: [
            { label: "State / Province", value: p.stateProvince },
            { label: "Country", value: p.country },
         ],
      },
   ]
})

const recordSection = computed<IDetailSection[]>(() => profile.value
   ? [{
      title: "Record",
      rows: [
         { label: "Created", value: formatDateTime(profile.value.createdAt), wide: true },
         { label: "Last updated", value: formatDateTime(profile.value.updatedAt), wide: true },
      ],
   }]
   : [])

onMounted(load)
</script>
