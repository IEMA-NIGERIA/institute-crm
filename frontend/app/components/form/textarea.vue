<template>
    <FormWrapper :label="fieldLabel" :required="required" :error="error" :hint="hint" v-slot="{ id, describedBy }">
        <textarea
            :id="id"
            :value="value ?? ''"
            @input="emits('update:value', ($event.target as HTMLTextAreaElement).value)"
            :placeholder="placeholder"
            :maxlength="maxlength"
            :aria-invalid="!!error"
            :aria-describedby="describedBy"
            class="form-control"
        />
    </FormWrapper>
</template>
<script setup lang="ts">
interface IProps {
    fieldLabel?: string
    value?: string | null
    placeholder?: string
    maxlength?: number
    required?: boolean
    error?: string
    hint?: string
}

withDefaults(defineProps<IProps>(), { value: "" })
const emits = defineEmits<{ "update:value": [value: string] }>()
</script>
