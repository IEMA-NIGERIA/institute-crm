<template>
   <NuxtLayout name="dashboard-layout">
      <div class="flex flex-wrap items-center justify-between gap-3">
         <div>
            <h2 class="text-2xl">Events</h2>
            <p class="text-sm">Training courses, workshops, seminars, conferences and award ceremonies.</p>
         </div>
         <NuxtLink
            v-if="auth.can(EVENTS_MANAGE_PERMISSION)"
            to="/dashboard/events/new"
            class="px-4 py-2.5 rounded-lg bg-[#103260] text-white text-sm font-medium no-underline"
         >
            New Event
         </NuxtLink>
      </div>

      <p v-if="createdTitle" class="flex items-center justify-between gap-3 mt-4 mb-0 p-3 rounded-lg bg-green-50 text-green-800 text-sm" role="status">
         <span>“{{ createdTitle }}” was created.</span>
         <button type="button" aria-label="Dismiss" @click="createdTitle = ''" class="p-1 rounded-md bg-transparent border-none text-green-800 cursor-pointer hover:bg-green-100">
            <CommonIcon icon="hugeicons:cancel-01" :size="16" />
         </button>
      </p>

      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
         <CommonMetricCard dark title="Total Events" :value="metric('total')" icon="hugeicons:calendar-03" />
         <CommonMetricCard title="Upcoming Events" :value="metric('upcoming')" icon="hugeicons:calendar-add-01" tone="success" />
         <CommonMetricCard title="In the Next 30 Days" :value="metric('nextThirtyDays')" icon="hugeicons:clock-01" tone="warning" />
         <CommonMetricCard
            title="Upcoming Capacity"
            :value="metric('totalCapacity')"
            subtitle="Seats across upcoming events with a limit"
            icon="hugeicons:user-group-02"
         />
      </div>

      <div class="grid md:grid-cols-[2fr_1fr_1fr] gap-3 mt-6">
         <CommonSearchInput
            :model-value="state.search"
            placeholder="Search events or venues"
            @update:model-value="set({ search: $event })"
         />
         <FormChoice :value="state.type" :options="EVENT_TYPE_OPTIONS" placeholder="All event types" clearable aria-label="Event type" @update:value="set({ type: $event })" />
         <FormChoice :value="state.when" :options="EVENT_TIMEFRAME_OPTIONS" placeholder="Any time" clearable aria-label="When" @update:value="set({ when: $event })" />
      </div>

      <EventsTable
         class="mt-4"
         :events="events"
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
   eventApi,
   EVENT_TIMEFRAME_OPTIONS,
   EVENT_TYPE_OPTIONS,
   EVENTS_MANAGE_PERMISSION,
   type IEvent,
   type IEventMetrics,
} from '~/composables/apiclient/event';
import { useAuthStore } from '~/stores/auth';

const PAGE_SIZE = 20

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Set by the create form; shown once, then dropped from the URL so a refresh doesn't repeat it.
const createdTitle = ref(typeof route.query.created === "string" ? route.query.created : "")
if (createdTitle.value) {
   const { created: _created, ...query } = route.query
   router.replace({ query })
}
const { state, page, isFiltered, set, setPage, clear } = useQueryState(["search", "type", "when"] as const)

const events = ref<IEvent[]>([])
const total = ref(0)
const isLoading = ref(true)
const error = ref("")
const metrics = ref<IEventMetrics | null>(null)

const metric = (key: keyof IEventMetrics) => metrics.value?.[key] ?? "—"

const load = async () => {
   isLoading.value = true
   error.value = ""
   const result = await eventApi.list({ ...state.value, page: page.value, pageSize: PAGE_SIZE })
   isLoading.value = false
   if (result.statusCode !== 200) {
      error.value = apiErrorMessage(result)
      return
   }
   events.value = result.responseBody.items
   total.value = result.responseBody.total
}

const loadMetrics = async () => {
   const result = await eventApi.metrics()
   if (result.statusCode === 200) metrics.value = result.responseBody
}

watch([state, page], load)
onMounted(() => Promise.all([load(), loadMetrics()]))
</script>
