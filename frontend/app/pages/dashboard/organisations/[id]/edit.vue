<template>
   <NuxtLayout name="dashboard-layout">
      <NuxtLink :to="`/dashboard/organisations/${route.params.id}`" class="text-sm text-gray-600 no-underline hover:text-gray-900">&larr; Back to organisation</NuxtLink>
      <div class="mt-3">
         <CommonPageState resource="organisation" :is-loading="isLoading" :error="error" :not-found="notFound" @retry="load">
            <h2 class="text-2xl mt-0 mb-4">Edit {{ organisation?.name }}</h2>
            <OrganisationsForm
               v-if="organisation"
               :organisation="organisation"
               @saved="navigateTo(`/dashboard/organisations/${$event.id}`)"
               @cancel="navigateTo(`/dashboard/organisations/${organisation.id}`)"
            />
         </CommonPageState>
      </div>
   </NuxtLayout>
</template>
<script setup lang="ts">
import { organisationApi, type IOrganisation } from '~/composables/apiclient/organisation';

const route = useRoute()
const { data: organisation, isLoading, error, notFound, load } = useLoader<IOrganisation>(
   () => organisationApi.get(String(route.params.id)),
   (body) => body.organisation,
)
onMounted(load)
</script>
