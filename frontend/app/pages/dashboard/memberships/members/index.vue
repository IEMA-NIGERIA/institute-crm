<template>
   <NuxtLayout name="dashboard-layout">
      <div class="">
         <div>
            <h2 class="text-2xl">Members</h2>
            <p class="text-sm">View the member register, grades and membership status.</p>
         </div>

         <div class="grid md:grid-cols-4 gap-4 mt-4">
            <CommonMetricCard
               dark
               title="Total Members"
               :value="metrics.total"
               icon="hugeicons:user-group-02"
            />
            <CommonMetricCard
               title="Active"
               :value="metrics.active"
               icon="hugeicons:user-check-01"
               tone="success"
            />
            <CommonMetricCard
               title="Pending"
               :value="metrics.pending"
               icon="hugeicons:clock-01"
               tone="warning"
            />
            <CommonMetricCard
               title="Lapsed"
               :value="metrics.lapsed"
               icon="hugeicons:user-remove-01"
               tone="danger"
            />
         </div>

         <MembersTable
            class="mt-6"
            :members="members"
            :total="total"
            :page="page"
            :page-size="PAGE_SIZE"
            :is-loading="isLoading"
            :error="error"
            @update:page="page = $event"
         />
      </div>
   </NuxtLayout>
</template>
<script setup lang="ts">
import type { IMember } from '~/composables/apiclient/member';

const PAGE_SIZE = 20

// There is no members API yet: these stay empty until one exists and a load() fills them,
// as on the enquiries page.
const members = ref<IMember[]>([])
const total = ref(0)
const page = ref(1)
const isLoading = ref(false)
const error = ref("")

const metrics = ref<Record<"total" | "active" | "pending" | "lapsed", number | string>>({
   total: "—",
   active: "—",
   pending: "—",
   lapsed: "—",
})
</script>
