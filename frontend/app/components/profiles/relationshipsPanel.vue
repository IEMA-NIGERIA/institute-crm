<template>
    <div>
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p class="m-0 text-sm text-gray-600">Every role this person holds with IEMA, past and present — all on this one profile.</p>
            <CommonButton v-if="canWrite" title="Add relationship" :block="false" @on-click="openModal(null)" />
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="grid md:grid-cols-2 gap-4" aria-busy="true">
            <div v-for="n in 2" :key="n" class="h-32 rounded-2xl bg-gray-100 animate-pulse" />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="flex flex-col items-center gap-3 px-5 py-14 text-center rounded-2xl bg-white border-solid border-1 border-gray-200">
            <p class="m-0 font-medium">Couldn't load relationships</p>
            <p class="m-0 text-sm text-gray-500">{{ error }}</p>
            <CommonButton title="Try again" variant="secondary" :block="false" @on-click="load" />
        </div>

        <!-- Empty -->
        <div v-else-if="!relationships.length" class="flex flex-col items-center gap-3 px-5 py-14 text-center rounded-2xl bg-white border-solid border-1 border-gray-200">
            <div class="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                <CommonIcon icon="hugeicons:link-04" :size="22" />
            </div>
            <p class="m-0 font-medium">No relationships yet</p>
            <p class="m-0 text-sm text-gray-500">Add one when this person becomes a member, candidate, delegate or attendee.</p>
        </div>

        <!-- Cards -->
        <div v-else class="grid md:grid-cols-2 gap-4">
            <article
                v-for="relationship in relationships"
                :key="relationship.id"
                class="box-border p-5 rounded-2xl bg-white border-solid border-1 border-gray-200"
                :class="{ 'opacity-75': relationship.endDate }"
            >
                <div class="flex items-start justify-between gap-3">
                    <h4 class="m-0 text-base font-semibold">{{ labelFor(RELATIONSHIP_TYPE_OPTIONS, relationship.type) }}</h4>
                    <CommonBadge :tone="relationship.endDate ? 'neutral' : STATUS_TONES[relationship.status] ?? 'neutral'">
                        {{ relationship.endDate ? "Ended" : labelFor(RELATIONSHIP_STATUS_OPTIONS, relationship.status) }}
                    </CommonBadge>
                </div>
                <p class="m-0 mt-2 text-sm text-gray-600">
                    {{ relationship.startDate ? formatDate(relationship.startDate) : "Start not recorded" }}
                    &ndash;
                    {{ relationship.endDate ? formatDate(relationship.endDate) : "present" }}
                </p>
                <p v-if="relationship.notes" class="m-0 mt-2 text-sm text-gray-700 whitespace-pre-line">{{ relationship.notes }}</p>
                <div v-if="canWrite" class="flex gap-1 mt-3 -ml-3">
                    <button type="button" @click="openModal(relationship)" class="px-3 py-1.5 rounded-lg bg-transparent border-none text-sm font-medium text-[#103260] cursor-pointer hover:bg-gray-100">Edit</button>
                    <button v-if="!relationship.endDate" type="button" @click="ending = relationship" class="px-3 py-1.5 rounded-lg bg-transparent border-none text-sm font-medium text-red-700 cursor-pointer hover:bg-red-50">End</button>
                </div>
            </article>
        </div>

        <ProfilesRelationshipModal
            :open="isModalOpen"
            :profile-id="profileId"
            :relationship="editing"
            :blocked-types="blockedTypes"
            @close="isModalOpen = false"
            @saved="afterChange(() => { isModalOpen = false })"
        />

        <CommonConfirmDialog
            :open="ending !== null"
            title="End this relationship?"
            :message="ending ? `The ${labelFor(RELATIONSHIP_TYPE_OPTIONS, ending.type).toLowerCase()} relationship will end today. It stays on the profile as history.` : ''"
            confirm-label="End relationship"
            danger
            :is-loading="isEnding"
            :error="endError"
            @close="ending = null"
            @confirm="endRelationship"
        />
    </div>
</template>
<script setup lang="ts">
import type { BadgeTone } from '~/components/common/badge.vue';
import { apiErrorMessage } from '~/composables/apiclient/api';
import { profileApi, RELATIONSHIP_STATUS_OPTIONS, RELATIONSHIP_TYPE_OPTIONS, type IRelationship } from '~/composables/apiclient/profile';
import { formatDate, labelFor } from '~/composables/format';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{ profileId: string }>()
/** Fired after any change, so the page can refresh the profile's badges. */
const emit = defineEmits<{ changed: [] }>()

const STATUS_TONES: Record<string, BadgeTone> = { active: "success", pending: "warning", lapsed: "danger", completed: "neutral" }

const auth = useAuthStore()
const canWrite = computed(() => auth.can("persons:write"))

const relationships = ref<IRelationship[]>([])
const isLoading = ref(true)
const error = ref("")
const isModalOpen = ref(false)
const editing = ref<IRelationship | null>(null)
const ending = ref<IRelationship | null>(null)
const isEnding = ref(false)
const endError = ref("")

const blockedTypes = computed(() => relationships.value
    .filter((r) => r.status === "active" && !r.endDate && r.id !== editing.value?.id)
    .map((r) => r.type))

const load = async () => {
    isLoading.value = true
    error.value = ""
    const result = await profileApi.relationships(props.profileId)
    isLoading.value = false
    if (result.statusCode !== 200) {
        error.value = apiErrorMessage(result)
        return
    }
    relationships.value = result.responseBody.items
}

const openModal = (relationship: IRelationship | null) => {
    editing.value = relationship
    isModalOpen.value = true
}

const afterChange = async (after: () => void) => {
    after()
    emit("changed")
    await load()
}

const endRelationship = async () => {
    if (!ending.value) return
    isEnding.value = true
    endError.value = ""
    const result = await profileApi.updateRelationship(props.profileId, ending.value.id, { endDate: new Date().toISOString().slice(0, 10) })
    isEnding.value = false
    if (result.statusCode !== 200) {
        endError.value = apiErrorMessage(result, "Could not end the relationship.")
        return
    }
    await afterChange(() => { ending.value = null })
}

onMounted(load)
</script>
