<template>
    <div :class="{ 'max-w-3xl': !inModal }">
        <p v-if="formError" class="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>
        <p v-if="duplicate" class="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
            {{ duplicate.message }} —
            <NuxtLink :to="`/dashboard/organisations/${duplicate.id}`" class="font-semibold text-amber-900">open it</NuxtLink>
        </p>

        <h3 class="text-lg mt-2 mb-4">Organisation</h3>
        <div class="space-y-4">
            <FormText field-label="Name" required autocomplete="off" :value="form.name" :error="fieldErrors.name" @update:value="form.name = $event" />
            <FormChipGroup
                field-label="Type"
                required
                hint="Choose every type that applies — e.g. a partner that also employs members."
                :options="ORGANISATION_TYPE_OPTIONS"
                :value="form.types"
                :error="fieldErrors.types"
                @update:value="form.types = $event"
            />
            <div class="grid md:grid-cols-2 gap-4">
                <FormText
                    :field-label="referenceLabel"
                    :value="form.registrationReference"
                    :error="fieldErrors.registrationReference"
                    @update:value="form.registrationReference = $event"
                />
                <FormText field-label="Sector" list="organisation-sector-options" :value="form.sector" :error="fieldErrors.sector" @update:value="form.sector = $event" />
                <FormChoice
                    field-label="Size"
                    placeholder="—"
                    clearable
                    :options="ORGANISATION_SIZE_OPTIONS"
                    :value="form.size"
                    :error="fieldErrors.size"
                    @update:value="form.size = $event"
                />
                <FormText field-label="Website" type="url" placeholder="https://" :value="form.website" :error="fieldErrors.website" @update:value="form.website = $event" />
            </div>
        </div>

        <h3 class="text-lg mt-8 mb-4">Address</h3>
        <div class="grid md:grid-cols-2 gap-4">
            <FormText
                v-for="field in ADDRESS_FIELDS"
                :key="field.key"
                :class="{ 'md:col-span-2': field.key === 'addressLine1' }"
                :field-label="field.label"
                :list="field.key === 'stateProvince' ? 'organisation-state-options' : undefined"
                :value="form[field.key]"
                :error="fieldErrors[field.key]"
                @update:value="form[field.key] = $event"
            />
        </div>

        <datalist id="organisation-sector-options">
            <option v-for="option in SECTOR_OPTIONS" :key="option.value" :value="option.value" />
        </datalist>
        <datalist id="organisation-state-options">
            <option v-for="option in NIGERIAN_STATE_OPTIONS" :key="option.value" :value="option.value" />
        </datalist>

        <div v-if="!inModal" class="flex gap-3 mt-8">
            <CommonButton :title="organisation ? 'Save Changes' : 'Create Organisation'" loading-title="Saving…" :block="false" :is-loading="isSaving" @on-click="submit" />
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isSaving" @on-click="emit('cancel')" />
        </div>
    </div>
</template>
<script setup lang="ts">
import {
    organisationApi,
    ORGANISATION_SIZE_OPTIONS,
    ORGANISATION_TYPE_OPTIONS,
    registrationReferenceLabel,
    type IOrganisation,
    type IOrganisationPayload,
} from '~/composables/apiclient/organisation';
import { NIGERIAN_STATE_OPTIONS, SECTOR_OPTIONS } from '~/composables/referenceData';

/**
 * Creates an organisation, or edits `organisation` when given; emits `saved` with the result.
 * In a modal (`inModal`) its own buttons are hidden: the modal calls the exposed `submit`.
 */
const props = defineProps<{ organisation?: IOrganisation, inModal?: boolean }>()
const emit = defineEmits<{ saved: [organisation: IOrganisation], cancel: [] }>()

const ADDRESS_FIELDS = [
    { key: "addressLine1", label: "Address Line 1" },
    { key: "city", label: "City" },
    { key: "stateProvince", label: "State / Province" },
    { key: "postalCode", label: "Postal / ZIP Code" },
    { key: "country", label: "Country" },
] as const

const toForm = (organisation?: IOrganisation) => ({
    name: organisation?.name ?? "",
    types: [...(organisation?.types ?? [])],
    registrationReference: organisation?.registrationReference ?? "",
    sector: organisation?.sector ?? "",
    size: organisation?.size ?? "",
    website: organisation?.website ?? "",
    addressLine1: organisation?.addressLine1 ?? "",
    city: organisation?.city ?? "",
    stateProvince: organisation?.stateProvince ?? "",
    postalCode: organisation?.postalCode ?? "",
    country: organisation?.country ?? (organisation ? "" : "Nigeria"),
})

const form = ref(toForm(props.organisation))
const isSaving = ref(false)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})
const duplicate = ref<{ id: string, message: string } | null>(null)

const referenceLabel = computed(() => registrationReferenceLabel(form.value.types))

// A field's error goes away as soon as it's edited.
for (const key of Object.keys(form.value) as (keyof typeof form.value)[]) {
    watch(() => form.value[key], () => { delete fieldErrors.value[key] }, { deep: true })
}

const orNull = (value: string) => value.trim() || null

const submit = async () => {
    isSaving.value = true
    formError.value = ""
    fieldErrors.value = {}
    duplicate.value = null

    const values = form.value
    const payload: IOrganisationPayload = {
        name: values.name,
        types: values.types,
        registrationReference: orNull(values.registrationReference),
        sector: orNull(values.sector),
        size: orNull(values.size),
        website: orNull(values.website),
        addressLine1: orNull(values.addressLine1),
        city: orNull(values.city),
        stateProvince: orNull(values.stateProvince),
        postalCode: orNull(values.postalCode),
        country: orNull(values.country),
    }
    const result = props.organisation ? await organisationApi.update(props.organisation.id, payload) : await organisationApi.create(payload)
    isSaving.value = false

    if (result.statusCode === 409 && result.responseBody?.existingId) {
        duplicate.value = { id: result.responseBody.existingId, message: "An organisation with this name or reference already exists" }
        return
    }
    if (result.statusCode !== 200 && result.statusCode !== 201) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "Please correct the highlighted fields." : (result.responseBody?.message ?? result.errorMessage ?? "Could not save the organisation.")
        return
    }
    emit("saved", result.responseBody.organisation)
}

defineExpose({ submit, isSaving })
</script>
