<template>
    <dialog
        ref="dialog"
        :aria-labelledby="titleId"
        class="modal p-0 rounded-2xl border-none shadow-xl w-[calc(100%-32px)] text-gray-900"
        :class="SIZES[size]"
        @cancel.prevent="emit('close')"
        @click="onBackdropClick"
    >
        <div class="shrink-0 flex items-start justify-between gap-4 px-6 pt-5 pb-3">
            <div>
                <h3 :id="titleId" class="m-0 text-lg font-semibold">{{ title }}</h3>
                <p v-if="description" class="m-0 mt-1 text-sm text-gray-500">{{ description }}</p>
            </div>
            <button
                type="button"
                aria-label="Close"
                @click="emit('close')"
                class="shrink-0 p-1.5 rounded-md bg-transparent border-none text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
            >
                <CommonIcon icon="hugeicons:cancel-01" :size="18" />
            </button>
        </div>
        <!-- Only the body scrolls, so the title and actions stay in view on long forms. -->
        <div class="flex-1 min-h-0 overflow-y-auto px-6 py-3">
            <slot />
        </div>
        <div v-if="$slots.footer" class="shrink-0 flex justify-end gap-2 px-6 pt-3 pb-5 border-t-solid border-t-1 border-gray-100">
            <slot name="footer" />
        </div>
    </dialog>
</template>
<script setup lang="ts">

/**
 * Native <dialog> shown with showModal(): the rest of the page is inert while open,
 * focus is trapped inside, and Esc / a backdrop click ask the parent to close it.
 */
interface IProps {
    open: boolean
    title: string
    description?: string
    size?: "sm" | "md" | "lg"
}

const props = withDefaults(defineProps<IProps>(), { size: "md" })
const emit = defineEmits<{ close: [] }>()

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }

const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()

watch(
    () => props.open,
    (open) => {
        if (!dialog.value) return
        if (open && !dialog.value.open) dialog.value.showModal()
        if (!open && dialog.value.open) dialog.value.close()
    },
    { flush: "post" },
)
onMounted(() => {
    if (props.open) dialog.value?.showModal()
})

// A click on the <dialog> element itself (not its content) is a click on the backdrop.
const onBackdropClick = (event: MouseEvent) => {
    if (event.target === dialog.value) emit("close")
}
</script>
<style scoped>
/* global.css zeroes every margin, which also removes the browser's centring of <dialog>. */
.modal {
    margin: auto;
    max-height: calc(100% - 32px);
}
/* Only while open: a closed <dialog> must keep the browser's display: none. */
.modal[open] {
    display: flex;
    flex-direction: column;
}
.modal::backdrop {
    background: rgba(11, 21, 36, 0.45);
}
</style>
