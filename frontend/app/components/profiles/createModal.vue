<template>
    <CommonModal
        :open="open"
        title="New profile"
        description="Add a person once; relationships, organisations and documents are attached to this one record."
        size="lg"
        @close="!form?.isSaving && emit('close')"
    >
        <!-- Re-created on every open, so the form always starts empty. -->
        <ProfilesForm v-if="open" ref="form" in-modal @saved="emit('created', $event)" />
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="form?.isSaving" @on-click="emit('close')" />
            <CommonButton title="Create Profile" loading-title="Creating…" :block="false" :is-loading="form?.isSaving" @on-click="form?.submit()" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">
import type { IProfile } from '~/composables/apiclient/profile';

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [], created: [profile: IProfile] }>()

const form = useTemplateRef<{ submit: () => Promise<void>, isSaving: boolean }>("form")
</script>
