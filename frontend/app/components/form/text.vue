<template>
    <FormWrapper
        :label="fieldLabel"
        :required="required"
        :error="error"
        :hint="hint"
        :class="$attrs.class"
        :style="$attrs.style"
        v-slot="{ id, describedBy }"
    >
        <input 
            v-bind="inputAttrs"
            :id="id"
            :type="type"
            :value="props.value"
            @input="emits('update:value', ($event.target as HTMLInputElement).value)"
            :placeholder="placeholder"
            :aria-invalid="!!error"
            :aria-describedby="describedBy"
            class="form-control"
        />
    </FormWrapper>
</template>
<script setup lang="ts">
 interface InputProps {
    fieldLabel?: string
    value?: string | number | null
    placeholder?: string
    type?: string
    required?: boolean
    error?: string
    hint?: string
}

// `class`/`style` style the field; every other attribute (@blur, min, autocomplete, …) goes to the <input>.
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
const inputAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs
    return rest
})

const props = withDefaults(defineProps<InputProps>(),{
    value:"",
    type:"text"
})

const emits = defineEmits(["update:value"])
</script>
