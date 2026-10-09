<template>
    <CommonModal
        :open="open"
        title="New organisation"
        description="Record a corporate or institutional member, partner, or employer."
        size="lg"
        @close="!form?.isSaving && emit('close')"
    >
        <!-- Re-created on every open, so the form always starts empty. -->
        <OrganisationsForm v-if="open" ref="form" in-modal @saved="emit('created', $event)" />
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="form?.isSaving" @on-click="emit('close')" />
            <CommonButton title="Create Organisation" loading-title="Creating…" :block="false" :is-loading="form?.isSaving" @on-click="form?.submit()" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">
import type { IOrganisation } from '~/composables/apiclient/organisation';

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [], created: [organisation: IOrganisation] }>()

const form = useTemplateRef<{ submit: () => Promise<void>, isSaving: boolean }>("form")
</script>
