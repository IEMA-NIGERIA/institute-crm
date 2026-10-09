<template>
    <div>
        <p class="flex items-center gap-2 m-0 mb-4 text-sm text-gray-600">
            <CommonIcon icon="hugeicons:square-lock-02" :size="16" class="shrink-0 text-gray-500" />
            Restricted — visible only to staff with access to profiles. Download links expire after a few minutes.
        </p>

        <p v-if="actionError" class="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ actionError }}</p>

        <CommonDataTable
            title="Documents"
            :columns="columns"
            :rows="documents"
            :total="documents.length"
            :page-size="documents.length || 1"
            :is-loading="isLoading"
            :error="error"
            error-title="Couldn't load documents"
            empty-title="No documents yet"
            empty-text="CVs, certificates, student IDs and evidence of experience attached to this profile appear here."
            empty-icon="hugeicons:file-01"
            @retry="load"
        >
            <template v-if="canWrite" #actions>
                <CommonButton title="Upload document" :block="false" @on-click="isUploading = true" />
            </template>
            <template #row="{ row: document }">
                <td class="px-5 py-3.5">
                    <div class="flex items-center gap-3">
                        <div class="shrink-0 w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                            <CommonIcon :icon="document.contentType.startsWith('image/') ? 'hugeicons:image-01' : 'hugeicons:file-01'" :size="18" />
                        </div>
                        <div class="min-w-0">
                            <p class="m-0 font-medium text-gray-900 break-all">{{ document.fileName }}</p>
                            <p class="m-0 text-xs text-gray-500">{{ labelFor(DOCUMENT_TYPE_OPTIONS, document.type) }}</p>
                        </div>
                    </div>
                </td>
                <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ formatFileSize(document.size) }}</td>
                <td class="px-5 py-3.5 text-gray-700 whitespace-nowrap">{{ document.uploadedBy?.name ?? "—" }}</td>
                <td class="px-5 py-3.5 text-gray-500 whitespace-nowrap">{{ formatDate(document.createdAt) }}</td>
                <td class="px-5 py-3.5 text-right whitespace-nowrap">
                    <button
                        type="button"
                        :disabled="downloadingId === document.id"
                        @click="download(document)"
                        class="px-3 py-1.5 rounded-lg bg-transparent border-none text-sm font-medium text-[#103260] cursor-pointer hover:bg-gray-100 disabled:opacity-50"
                    >
                        {{ downloadingId === document.id ? "Opening…" : "Download" }}
                    </button>
                    <button
                        v-if="canWrite"
                        type="button"
                        @click="deleting = document"
                        class="px-3 py-1.5 rounded-lg bg-transparent border-none text-sm font-medium text-red-700 cursor-pointer hover:bg-red-50"
                    >
                        Delete
                    </button>
                </td>
            </template>
        </CommonDataTable>

        <ProfilesDocumentUploadModal
            :open="isUploading"
            :profile-id="profileId"
            @close="isUploading = false"
            @uploaded="isUploading = false; load()"
        />

        <CommonConfirmDialog
            :open="deleting !== null"
            title="Delete this document?"
            :message="deleting ? `${deleting.fileName} will be permanently deleted. This can't be undone.` : ''"
            confirm-label="Delete"
            danger
            :is-loading="isDeleting"
            :error="deleteError"
            @close="deleting = null"
            @confirm="remove"
        />
    </div>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import { DOCUMENT_TYPE_OPTIONS, profileApi, type IProfileDocument } from '~/composables/apiclient/profile';
import { formatDate, formatFileSize, labelFor } from '~/composables/format';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{ profileId: string }>()

const columns = ["Document", "Size", "Uploaded By", "Date", ""]

const auth = useAuthStore()
const canWrite = computed(() => auth.can("persons:write"))

const documents = ref<IProfileDocument[]>([])
const isLoading = ref(true)
const error = ref("")
const actionError = ref("")
const isUploading = ref(false)
const downloadingId = ref<string | null>(null)
const deleting = ref<IProfileDocument | null>(null)
const isDeleting = ref(false)
const deleteError = ref("")

const load = async () => {
    isLoading.value = true
    error.value = ""
    const result = await profileApi.documents(props.profileId)
    isLoading.value = false
    if (result.statusCode !== 200) {
        error.value = apiErrorMessage(result)
        return
    }
    documents.value = result.responseBody.items
}

const download = async (document: IProfileDocument) => {
    actionError.value = ""
    // Open the tab during the click so pop-up blockers allow it, then point it at the signed link.
    const tab = window.open("", "_blank")
    downloadingId.value = document.id
    const result = await profileApi.documentDownload(props.profileId, document.id)
    downloadingId.value = null
    if (result.statusCode !== 200 || !result.responseBody?.url) {
        tab?.close()
        actionError.value = apiErrorMessage(result, "Could not open the document.")
        return
    }
    if (tab) {
        tab.opener = null
        tab.location.href = result.responseBody.url
    } else {
        window.location.assign(result.responseBody.url)
    }
}

const remove = async () => {
    if (!deleting.value) return
    isDeleting.value = true
    deleteError.value = ""
    const result = await profileApi.deleteDocument(props.profileId, deleting.value.id)
    isDeleting.value = false
    if (result.statusCode !== 204 && result.statusCode !== 200) {
        deleteError.value = apiErrorMessage(result, "Could not delete the document.")
        return
    }
    deleting.value = null
    await load()
}

onMounted(load)
</script>
