<template>
    <FormWrapper
        :label="fieldLabel"
        :required="required"
        :error="error"
        :hint="hint"
        v-slot="{ id, describedBy }"
    >
        <div class="relative">
            <input 
                :id="id"
                :aria-describedby="describedBy"
                :type="isVisible ? 'text' : 'password'"
                :value="props.value"
                @input="emits('update:value', ($event.target as HTMLInputElement).value)"
                :placeholder="placeholder"
                :autocomplete="autocomplete"
                :aria-invalid="!!error"
                class="form-control"
                style="padding-right: 44px"
            />
            <button
                type="button"
                @click="isVisible = !isVisible"
                :aria-label="isVisible ? 'Hide password' : 'Show password'"
                :aria-pressed="isVisible"
                class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center p-1.5 rounded-md bg-transparent border-none text-[#6B7280] hover:text-[#131A26] cursor-pointer"
            >
                <CommonIcon :icon="isVisible ? 'hugeicons:view-off' : 'hugeicons:view'" :size="20" />
            </button>
        </div>
    </FormWrapper>
</template>
<script setup lang="ts">
 interface InputProps {
    fieldLabel?: string
    value?: string
    placeholder?: string
    required?: boolean
    error?: string
    hint?: string
    /** "new-password" when setting a password, so browsers don't fill in a saved one. */
    autocomplete?: "current-password" | "new-password"
}

const props = withDefaults(defineProps<InputProps>(),{
    value:"",
    autocomplete:"current-password"
})

const emits = defineEmits(["update:value"])

const isVisible = ref(false)
</script>
