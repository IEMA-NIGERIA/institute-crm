<template>
   <NuxtLayout name="dashboard-layout">
      <div>
         <div class="mb-6">
            <h2 class="capitalize text-2xl font-semibold">
               Hello, {{ auth.user?.firstName ?? 'there' }}
            </h2>
            <p class="text-sm text-gray-500 mt-1">
               Here's an overview of what's happening across IEMA today.
            </p>
         </div>
         <div class=""></div>
      </div>
   </NuxtLayout>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
</script>
