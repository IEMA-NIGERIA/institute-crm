<template>
    <FormWrapper :label="fieldLabel" :required="required" :error="error" :hint="hint">
        <div role="group" :aria-label="fieldLabel" class="flex flex-wrap gap-2">
            <label
                v-for="option in options"
                :key="option.value"
                class="chip inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-solid border-1 text-[13px] font-medium cursor-pointer select-none transition-colors"
                :class="value.includes(option.value)
                    ? 'bg-[#16263D] border-[#16263D] text-white'
                    : 'bg-[#FBFAF8] border-[#E8E4DD] text-[#3A4252] hover:bg-white hover:border-[#D9D4CB]'"
            >
                <input
                    type="checkbox"
                    :value="option.value"
                    :checked="value.includes(option.value)"
                    @change="toggle(option.value, ($event.target as HTMLInputElement).checked)"
                    class="m-0 w-3.5 h-3.5 accent-[#C8102E]"
                />
                {{ option.label }}
            </label>
        </div>
    </FormWrapper>
</template>
<script setup lang="ts">
import type { IOption } from '~/composables/format';

/** Multi-select checkbox chips, styled like the quote form's radio chips. */
interface IProps {
    fieldLabel?: string
    value: string[]
    options: readonly IOption[]
    required?: boolean
    error?: string
    hint?: string
}

const props = defineProps<IProps>()
const emits = defineEmits<{ "update:value": [value: string[]] }>()

// Keeps the options' order regardless of click order.
const toggle = (option: string, checked: boolean) => {
    const next = new Set(props.value)
    if (checked) next.add(option)
    else next.delete(option)
    emits("update:value", props.options.map((o) => o.value).filter((v) => next.has(v)))
}
</script>
<style scoped>
.chip:has(input:focus-visible) {
    box-shadow: 0 0 0 4px rgba(200, 16, 46, 0.12);
}
</style>
