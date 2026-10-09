<template>
    <CommonModal
        :open="open"
        title="New enquiry"
        description="Record an enquiry from an individual or an organisation."
        size="lg"
        @close="!isSaving && emit('close')"
    >
        <div class="space-y-4">
            <p v-if="formError" class="m-0 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>

            <div class="grid sm:grid-cols-2 gap-4">
                <FormChoice
                    field-label="Enquirer Type"
                    required
                    :options="ENQUIRER_TYPE_OPTIONS"
                    :value="form.enquirerType"
                    :error="fieldErrors.enquirerType"
                    @update:value="setField('enquirerType', $event)"
                />
                <FormChoice
                    field-label="Interest Type"
                    required
                    placeholder="Select an interest"
                    :options="INTEREST_TYPE_OPTIONS"
                    :value="form.interestType"
                    :error="fieldErrors.interestType"
                    @update:value="setField('interestType', $event)"
                />
                <FormText
                    :field-label="isOrganisation ? 'Organisation Name' : 'Full Name'"
                    required
                    :value="form.name"
                    :error="fieldErrors.name"
                    @update:value="setField('name', $event)"
                />
                <FormText
                    v-if="!isOrganisation"
                    field-label="Employer"
                    :value="form.employer"
                    :error="fieldErrors.employer"
                    @update:value="setField('employer', $event)"
                />
                <FormText
                    field-label="Sector"
                    placeholder="e.g. Oil & Gas, Manufacturing"
                    :value="form.sector"
                    :error="fieldErrors.sector"
                    @update:value="setField('sector', $event)"
                />
                <FormChoice
                    field-label="Source"
                    required
                    placeholder="How did they reach us?"
                    :options="ENQUIRY_SOURCE_OPTIONS"
                    :value="form.source"
                    :error="fieldErrors.source"
                    @update:value="setField('source', $event)"
                />
                <FormText
                    field-label="Estimated Value (₦)"
                    type="number"
                    placeholder="0.00"
                    :value="form.estimatedValue"
                    :error="fieldErrors.estimatedValue"
                    @update:value="setField('estimatedValue', $event)"
                />
            </div>

            <div>
                <h4 class="m-0 text-base font-semibold">Contact Details</h4>
                <p class="m-0 mt-1 text-sm text-gray-600">Provide at least an email address or a phone number.</p>
                <div class="grid sm:grid-cols-2 gap-4 mt-4">
                    <FormText
                        field-label="Email Address"
                        type="email"
                        :value="form.email"
                        :error="fieldErrors.email"
                        @update:value="setField('email', $event)"
                    />
                    <FormText
                        field-label="Phone Number"
                        type="tel"
                        :value="form.phone"
                        :error="fieldErrors.phone"
                        @update:value="setField('phone', $event)"
                    />
                    <FormText
                        v-for="field in ADDRESS_FIELDS"
                        :key="field.key"
                        :class="{ 'sm:col-span-2': field.key === 'addressLine1' }"
                        :field-label="field.label"
                        :value="form[field.key]"
                        :error="fieldErrors[field.key]"
                        @update:value="setField(field.key, $event)"
                    />
                </div>
            </div>
        </div>
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isSaving" @on-click="emit('close')" />
            <CommonButton title="Create Enquiry" loading-title="Creating…" :block="false" :is-loading="isSaving" @on-click="submit" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import {
    enquiryApi,
    ENQUIRER_TYPE_OPTIONS,
    ENQUIRY_SOURCE_OPTIONS,
    INTEREST_TYPE_OPTIONS,
    type ICreateEnquiryPayload,
    type IEnquiry,
} from '~/composables/apiclient/enquiry';

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [], created: [enquiry: IEnquiry] }>()

const ADDRESS_FIELDS = [
    { key: "addressLine1", label: "Address Line 1" },
    { key: "city", label: "City" },
    { key: "stateProvince", label: "State / Province" },
    { key: "postalCode", label: "Postal / ZIP Code" },
    { key: "country", label: "Country" },
] as const

const emptyForm = () => ({
    enquirerType: "individual",
    name: "",
    email: "",
    phone: "",
    employer: "",
    sector: "",
    addressLine1: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "",
    interestType: "",
    source: "",
    estimatedValue: "",
})

type Field = keyof ReturnType<typeof emptyForm>

const form = ref(emptyForm())
const isSaving = ref(false)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})

// Start fresh each time it opens.
watch(() => props.open, (open) => {
    if (!open) return
    form.value = emptyForm()
    formError.value = ""
    fieldErrors.value = {}
})

const isOrganisation = computed(() => form.value.enquirerType === "organisation")

/** Updates a field and drops its now-stale error (a contact detail clears the "email or phone" error too). */
const setField = (key: Field, value: string) => {
    form.value[key] = value
    delete fieldErrors.value[key]
    if (key === "phone") delete fieldErrors.value.email
}

const orNull = (value: string) => value.trim() || null

const submit = async () => {
    formError.value = ""
    fieldErrors.value = {}

    const values = form.value
    const estimatedValue = String(values.estimatedValue).trim()
    isSaving.value = true
    const result = await enquiryApi.create({
        enquirerType: values.enquirerType,
        name: values.name,
        email: orNull(values.email),
        phone: orNull(values.phone),
        employer: isOrganisation.value ? null : orNull(values.employer),
        sector: orNull(values.sector),
        ...Object.fromEntries(ADDRESS_FIELDS.map(({ key }) => [key, orNull(values[key])])) as Pick<ICreateEnquiryPayload, typeof ADDRESS_FIELDS[number]["key"]>,
        interestType: values.interestType,
        source: values.source,
        estimatedValue: estimatedValue === "" ? null : Number(estimatedValue),
    })
    isSaving.value = false

    if (result.statusCode !== 201) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "Please correct the highlighted fields." : apiErrorMessage(result, "Could not create the enquiry.")
        return
    }
    emit("created", result.responseBody.enquiry)
}
</script>
