<template>
    <CommonModal :open="open" title="Upload document" description="Visible to staff with access to profiles." @close="!isUploading && emit('close')">
        <div class="space-y-4">
            <p v-if="formError" class="m-0 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>
            <FormChoice
                field-label="Document Type"
                required
                placeholder="Choose a type"
                :options="DOCUMENT_TYPE_OPTIONS"
                :value="type"
                :error="fieldErrors.type"
                @update:value="type = $event"
            />
            <FormFileUpload
                field-label="File"
                required
                :value="file"
                :accept="DOCUMENT_RULES.accept"
                :mime-types="DOCUMENT_RULES.mimeTypes"
                :max-bytes="DOCUMENT_RULES.maxBytes"
                :progress="progress"
                rules-text="PDF, JPG, PNG or DOCX · up to 10 MB"
                :error="fieldErrors.file"
                @update:value="file = $event"
            />
        </div>
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isUploading" @on-click="emit('close')" />
            <CommonButton title="Upload" loading-title="Uploading…" :block="false" :is-loading="isUploading" @on-click="submit" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import { DOCUMENT_RULES, DOCUMENT_TYPE_OPTIONS, profileApi } from '~/composables/apiclient/profile';

const props = defineProps<{ open: boolean, profileId: string }>()
const emit = defineEmits<{ close: [], uploaded: [] }>()

const type = ref("")
const file = ref<File | null>(null)
const progress = ref<number | null>(null)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})
const isUploading = computed(() => progress.value !== null)

watch(() => props.open, (open) => {
    if (!open) return
    type.value = ""
    file.value = null
    progress.value = null
    formError.value = ""
    fieldErrors.value = {}
})

const submit = async () => {
    formError.value = ""
    fieldErrors.value = {}
    if (!type.value) fieldErrors.value.type = "Choose a document type"
    if (!file.value) fieldErrors.value.file = "Choose a file to upload"
    if (Object.keys(fieldErrors.value).length) return

    progress.value = 0
    const result = await profileApi.uploadDocument(props.profileId, file.value!, type.value, (percent) => { progress.value = percent })
    progress.value = null
    if (result.statusCode !== 201 && result.statusCode !== 200) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "" : apiErrorMessage(result, "Could not upload the document.")
        return
    }
    emit("uploaded")
}
</script>
