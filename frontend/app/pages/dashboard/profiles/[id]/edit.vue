<template>
   <NuxtLayout name="dashboard-layout">
      <NuxtLink :to="`/dashboard/profiles/${route.params.id}`" class="text-sm text-gray-600 no-underline hover:text-gray-900">&larr; Back to profile</NuxtLink>
      <div class="mt-3">
         <CommonPageState resource="profile" :is-loading="isLoading" :error="error" :not-found="notFound" @retry="load">
            <h2 class="text-2xl mt-0 mb-4">Edit {{ profile ? profileFullName(profile) : "" }}</h2>
            <ProfilesForm
               v-if="profile"
               :profile="profile"
               @saved="navigateTo(`/dashboard/profiles/${$event.id}`)"
               @cancel="navigateTo(`/dashboard/profiles/${profile.id}`)"
            />
         </CommonPageState>
      </div>
   </NuxtLayout>
</template>
<script setup lang="ts">
import { profileApi, profileFullName, type IProfile } from '~/composables/apiclient/profile';

const route = useRoute()
const { data: profile, isLoading, error, notFound, load } = useLoader<IProfile>(
   () => profileApi.get(String(route.params.id)),
   (body) => body.profile,
)
onMounted(load)
</script>
