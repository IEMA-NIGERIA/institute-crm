<template>
    <CommonModal :open="open" :title="title" size="sm" @close="emit('close')">
        <p class="m-0 text-sm text-gray-600">{{ message }}</p>
        <p v-if="error" class="m-0 mt-3 text-sm text-red-700">{{ error }}</p>
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isLoading" @on-click="emit('close')" />
            <CommonButton :title="confirmLabel" :variant="danger ? 'danger' : 'primary'" :block="false" :is-loading="isLoading" @on-click="emit('confirm')" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">

interface IProps {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    danger?: boolean
    isLoading?: boolean
    error?: string
}

withDefaults(defineProps<IProps>(), {
    confirmLabel: "Confirm",
    danger: false,
    isLoading: false,
    error: "",
})
const emit = defineEmits<{ confirm: [], close: [] }>()
</script>
