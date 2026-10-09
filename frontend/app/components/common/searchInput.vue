<template>
    <div class="relative">
        <CommonIcon icon="hugeicons:search-01" :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
            type="search"
            :value="text"
            @input="onInput(($event.target as HTMLInputElement).value)"
            :placeholder="placeholder"
            :aria-label="placeholder"
            class="form-control"
            style="padding-left: 38px"
        />
    </div>
</template>
<script setup lang="ts">

/** Search box that emits `update:modelValue` once typing pauses. */
const props = withDefaults(defineProps<{ modelValue: string, placeholder?: string, debounceMs?: number }>(), {
    placeholder: "Search…",
    debounceMs: 300,
})
const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const text = ref(props.modelValue)
watch(() => props.modelValue, (value) => { text.value = value })

let timer: ReturnType<typeof setTimeout> | undefined
const onInput = (value: string) => {
    text.value = value
    clearTimeout(timer)
    timer = setTimeout(() => emit("update:modelValue", value.trim()), props.debounceMs)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>
