<template>
    <CommonModal :open="open" :title="relationship ? 'Edit relationship' : 'Add relationship'" @close="emit('close')">
        <div class="space-y-4">
            <p v-if="formError" class="m-0 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>
            <FormChoice
                field-label="Type"
                required
                placeholder="Choose a relationship"
                :options="typeOptions"
                :value="form.type"
                :error="fieldErrors.type"
                :hint="form.status === 'active' && blockedTypes.length ? 'Types this person already holds as active are unavailable.' : undefined"
                @update:value="form.type = $event"
            />
            <FormChoice
                field-label="Status"
                required
                :options="RELATIONSHIP_STATUS_OPTIONS"
                :value="form.status"
                :error="fieldErrors.status"
                @update:value="form.status = $event"
            />
            <div class="grid sm:grid-cols-2 gap-4">
                <FormText field-label="Start Date" type="date" :value="form.startDate" :error="fieldErrors.startDate" @update:value="form.startDate = $event" />
                <FormText field-label="End Date" type="date" :min="form.startDate || undefined" :value="form.endDate" :error="fieldErrors.endDate" @update:value="form.endDate = $event" />
            </div>
            <FormTextarea field-label="Notes" :maxlength="1000" :value="form.notes" :error="fieldErrors.notes" @update:value="form.notes = $event" />
        </div>
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isSaving" @on-click="emit('close')" />
            <CommonButton :title="relationship ? 'Save' : 'Add'" loading-title="Saving…" :block="false" :is-loading="isSaving" @on-click="submit" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import {
    profileApi,
    RELATIONSHIP_STATUS_OPTIONS,
    RELATIONSHIP_TYPE_OPTIONS,
    type IRelationship,
    type IRelationshipPayload,
} from '~/composables/apiclient/profile';

interface IProps {
    open: boolean
    profileId: string
    /** Edit this relationship; omit to add one. */
    relationship?: IRelationship | null
    /** Types the profile already holds as active (excluding the one being edited). */
    blockedTypes: string[]
}

const props = defineProps<IProps>()
const emit = defineEmits<{ close: [], saved: [] }>()

const emptyForm = () => ({ type: "", status: "active", startDate: new Date().toISOString().slice(0, 10), endDate: "", notes: "" })

const form = ref(emptyForm())
const isSaving = ref(false)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})

watch(() => props.open, (open) => {
    if (!open) return
    const r = props.relationship
    form.value = r
        ? { type: r.type, status: r.status, startDate: r.startDate ?? "", endDate: r.endDate ?? "", notes: r.notes ?? "" }
        : emptyForm()
    formError.value = ""
    fieldErrors.value = {}
})

// A person can't hold two active relationships of the same type.
const typeOptions = computed(() => RELATIONSHIP_TYPE_OPTIONS.map((option) => ({
    ...option,
    disabled: form.value.status === "active" && !form.value.endDate && props.blockedTypes.includes(option.value),
})))

const submit = async () => {
    formError.value = ""
    fieldErrors.value = {}
    const values = form.value
    if (!values.type) fieldErrors.value.type = "Choose a relationship type"
    else if (typeOptions.value.find((o) => o.value === values.type)?.disabled) fieldErrors.value.type = "This person already has an active relationship of this type"
    if (values.startDate && values.endDate && values.endDate < values.startDate) fieldErrors.value.endDate = "End date can't be before the start date"
    if (Object.keys(fieldErrors.value).length) return

    const payload: IRelationshipPayload = {
        type: values.type,
        status: values.status,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        notes: values.notes.trim() || null,
    }
    isSaving.value = true
    const result = props.relationship
        ? await profileApi.updateRelationship(props.profileId, props.relationship.id, payload)
        : await profileApi.addRelationship(props.profileId, payload)
    isSaving.value = false
    if (result.statusCode !== 200 && result.statusCode !== 201) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "" : apiErrorMessage(result, "Could not save the relationship.")
        return
    }
    emit("saved")
}
</script>
