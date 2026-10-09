<template>
    <FormWrapper :label="fieldLabel" :required="required" :error="error || localError" :hint="hint" v-slot="{ id, describedBy }">
        <!-- Chosen file -->
        <div v-if="value" class="box-border p-3 rounded-xl border-solid border-1 border-[#D9D4CB] bg-white">
            <div class="flex items-center gap-3">
                <div class="shrink-0 w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                    <CommonIcon icon="hugeicons:file-01" :size="20" />
                </div>
                <div class="min-w-0 flex-1">
                    <p class="m-0 text-sm font-medium truncate">{{ value.name }}</p>
                    <p class="m-0 text-xs text-gray-500">{{ formatFileSize(value.size) }}</p>
                </div>
                <button
                    v-if="progress === null"
                    type="button"
                    @click="emits('update:value', null)"
                    class="shrink-0 px-2 py-1 rounded-md bg-transparent border-none text-xs font-medium text-[#103260] cursor-pointer hover:bg-gray-100"
                >
                    Remove
                </button>
            </div>
            <div v-if="progress !== null" class="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" aria-label="Upload progress">
                <div class="h-full rounded-full bg-[#103260] transition-all" :style="{ width: `${progress}%` }" />
            </div>
        </div>

        <!-- Drop zone -->
        <label
            v-else
            :for="id"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
            class="drop-zone flex flex-col items-center gap-2 px-4 py-8 rounded-xl border-dashed border-2 text-center cursor-pointer transition-colors"
            :class="isDragging ? 'border-[#C8102E] bg-red-50/40' : 'border-[#D9D4CB] bg-[#FBFAF8] hover:bg-white'"
        >
            <CommonIcon icon="hugeicons:cloud-upload" :size="26" class="text-gray-500" />
            <span class="text-sm"><span class="font-semibold text-[#103260]">Choose a file</span> or drag it here</span>
            <span class="text-xs text-gray-500">{{ rulesText }}</span>
            <input :id="id" type="file" :accept="accept" :aria-describedby="describedBy" class="sr-only" @change="onPick" />
        </label>
    </FormWrapper>
</template>
<script setup lang="ts">
import { formatFileSize } from '~/composables/format';

interface IProps {
    fieldLabel?: string
    value: File | null
    /** For the file picker, e.g. ".pdf,.png". */
    accept?: string
    mimeTypes?: string[]
    maxBytes?: number
    /** 0–100 while uploading; null otherwise. */
    progress?: number | null
    rulesText?: string
    required?: boolean
    error?: string
    hint?: string
}

const props = withDefaults(defineProps<IProps>(), { progress: null })
const emits = defineEmits<{ "update:value": [value: File | null] }>()

const isDragging = ref(false)
const localError = ref("")

const take = (file: File | undefined) => {
    localError.value = ""
    if (!file) return
    if (props.mimeTypes && !props.mimeTypes.includes(file.type)) {
        localError.value = "This file type isn't allowed."
        return
    }
    if (props.maxBytes && file.size > props.maxBytes) {
        localError.value = `This file is larger than ${formatFileSize(props.maxBytes)}.`
        return
    }
    emits("update:value", file)
}

const onPick = (event: Event) => {
    const input = event.target as HTMLInputElement
    take(input.files?.[0])
    input.value = ""
}

const onDrop = (event: DragEvent) => {
    isDragging.value = false
    take(event.dataTransfer?.files[0])
}
</script>
<style scoped>
.drop-zone:has(input:focus-visible) {
    border-color: #C8102E;
    box-shadow: 0 0 0 4px rgba(200, 16, 46, 0.12);
}
</style>
