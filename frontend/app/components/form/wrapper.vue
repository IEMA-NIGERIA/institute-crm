<template>
<div>
    <label v-if="props.label" :for="id" class="form-label">
        {{ props.label }}<template v-if="required"> *</template>
    </label>
    <slot :id="id" :described-by="error ? `${id}-error` : undefined" />
    <p v-if="hint && !error" class="m-0 mt-1.5 text-xs text-gray-500">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="form-error">{{ error }}</p>
</div>
</template>
<script setup lang="ts">

interface IProps {
    label?: string
    required?: boolean
    error?: string
    hint?: string
}

const props = withDefaults(defineProps<IProps>(),{
    required:false
})

// Ties the label and error text to the control rendered in the slot.
const id = useId()
</script>
