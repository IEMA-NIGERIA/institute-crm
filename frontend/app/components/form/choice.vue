<template>
    <FormWrapper 
        :label="fieldLabel"
        :required="required"
        :error="error"
        :hint="hint"
        v-slot="{ id, describedBy }"
    >
    <select 
        :id="id"
        :value="value" 
        @change="emits('update:value', ($event.target as HTMLSelectElement).value)"
        :aria-invalid="!!error"
        :aria-describedby="describedBy"
        :aria-label="fieldLabel ? undefined : ariaLabel"
        class="form-control">
        <option v-if="placeholder" value="" :disabled="!clearable">{{ placeholder }}</option>
        <option v-for="itm in options" :key="itm.value" :value="itm.value" :disabled="itm.disabled">
            {{ itm.label }}
        </option>
    </select>
    </FormWrapper>
</template>
<script setup lang="ts">

export interface IChoiceOption {
    value: string
    label: string
    disabled?: boolean
}

interface IProps {
    fieldLabel?: string
    required?: boolean
    value: string
    options: readonly IChoiceOption[]
    placeholder?: string
    /** Lets the placeholder be picked again, e.g. "All sectors" in a filter. */
    clearable?: boolean
    error?: string
    hint?: string
    /** Accessible name when there's no visible label. */
    ariaLabel?: string
}

withDefaults(defineProps<IProps>(),{
    clearable: false
})
const emits =defineEmits(["update:value"])
</script>
