<template>
    <div :class="{ 'max-w-3xl': !inModal }">
        <p v-if="formError" class="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>

        <h3 class="text-lg mt-2 mb-4">Identity</h3>
        <div class="grid md:grid-cols-[140px_1fr_1fr] gap-4">
            <FormChoice
                field-label="Title"
                placeholder="—"
                clearable
                :options="TITLE_OPTIONS"
                :value="form.title"
                :error="fieldErrors.title"
                @update:value="form.title = $event"
            />
            <FormText field-label="First Name" required autocomplete="off" :value="form.firstName" :error="fieldErrors.firstName" @update:value="form.firstName = $event" />
            <FormText field-label="Last Name" required autocomplete="off" :value="form.lastName" :error="fieldErrors.lastName" @update:value="form.lastName = $event" />
        </div>
        <div class="grid md:grid-cols-2 gap-4 mt-4">
            <div>
                <FormText
                    field-label="Email Address"
                    type="email"
                    required
                    autocomplete="off"
                    :value="form.email"
                    :error="fieldErrors.email"
                    @update:value="onEmailInput"
                    @blur="checkDuplicateEmail"
                />
                <p v-if="duplicate" class="m-0 mt-1.5 text-xs text-amber-800">
                    A profile with this email already exists —
                    <NuxtLink :to="`/dashboard/profiles/${duplicate.id}`" class="font-semibold text-amber-900">open {{ duplicate.name }}</NuxtLink>
                </p>
            </div>
            <FormText field-label="Phone Number" type="tel" :value="form.mobile" :error="fieldErrors.mobile" @update:value="form.mobile = $event" />
        </div>

        <h3 class="text-lg mt-8 mb-4">Professional</h3>
        <div class="grid md:grid-cols-2 gap-4">
            <FormText
                field-label="Employer"
                hint="To record a formal link (e.g. HR contact), use the profile's Organisations tab."
                :value="form.employer"
                :error="fieldErrors.employer"
                @update:value="form.employer = $event"
            />
            <FormText field-label="Job Role" :value="form.jobRole" :error="fieldErrors.jobRole" @update:value="form.jobRole = $event" />
            <FormText field-label="Sector" list="profile-sector-options" :value="form.sector" :error="fieldErrors.sector" @update:value="form.sector = $event" />
            <FormChoice
                field-label="Highest Qualification"
                placeholder="—"
                clearable
                :options="QUALIFICATION_OPTIONS"
                :value="form.highestQualification"
                :error="fieldErrors.highestQualification"
                @update:value="form.highestQualification = $event"
            />
            <FormText
                field-label="Years of Experience"
                type="number"
                min="0"
                max="60"
                step="1"
                :value="form.yearsOfExperience"
                :error="fieldErrors.yearsOfExperience"
                @update:value="form.yearsOfExperience = $event"
            />
        </div>

        <h3 class="text-lg mt-8 mb-4">Location</h3>
        <div class="grid md:grid-cols-2 gap-4">
            <FormText field-label="State / Province" list="profile-state-options" :value="form.stateProvince" :error="fieldErrors.stateProvince" @update:value="form.stateProvince = $event" />
            <FormText field-label="Country" :value="form.country" :error="fieldErrors.country" @update:value="form.country = $event" />
        </div>

        <datalist id="profile-sector-options">
            <option v-for="option in SECTOR_OPTIONS" :key="option.value" :value="option.value" />
        </datalist>
        <datalist id="profile-state-options">
            <option v-for="option in NIGERIAN_STATE_OPTIONS" :key="option.value" :value="option.value" />
        </datalist>

        <div v-if="!inModal" class="flex gap-3 mt-8">
            <CommonButton :title="profile ? 'Save Changes' : 'Create Profile'" loading-title="Saving…" :block="false" :is-loading="isSaving" @on-click="submit" />
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isSaving" @on-click="emit('cancel')" />
        </div>
    </div>
</template>
<script setup lang="ts">
import {
    profileApi,
    profileFullName,
    QUALIFICATION_OPTIONS,
    TITLE_OPTIONS,
    type IProfile,
    type IProfilePayload,
} from '~/composables/apiclient/profile';
import { NIGERIAN_STATE_OPTIONS, SECTOR_OPTIONS } from '~/composables/referenceData';

/**
 * Creates a profile, or edits `profile` when given; emits `saved` with the result.
 * In a modal (`inModal`) its own buttons are hidden: the modal calls the exposed `submit`.
 */
const props = defineProps<{ profile?: IProfile, inModal?: boolean }>()
const emit = defineEmits<{ saved: [profile: IProfile], cancel: [] }>()

const toForm = (profile?: IProfile) => ({
    title: profile?.title ?? "",
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    email: profile?.email ?? "",
    mobile: profile?.mobile ?? "",
    employer: profile?.employer ?? "",
    jobRole: profile?.jobRole ?? "",
    sector: profile?.sector ?? "",
    highestQualification: profile?.highestQualification ?? "",
    yearsOfExperience: profile?.yearsOfExperience == null ? "" : String(profile.yearsOfExperience),
    stateProvince: profile?.stateProvince ?? "",
    country: profile?.country ?? (profile ? "" : "Nigeria"),
})

const form = ref(toForm(props.profile))
const isSaving = ref(false)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})
const duplicate = ref<{ id: string, name: string } | null>(null)

// A field's error goes away as soon as it's edited.
for (const key of Object.keys(form.value) as (keyof typeof form.value)[]) {
    watch(() => form.value[key], () => { delete fieldErrors.value[key] })
}

const orNull = (value: string) => value.trim() || null

const onEmailInput = (value: string) => {
    form.value.email = value
    duplicate.value = null
}

const checkDuplicateEmail = async () => {
    const email = form.value.email.trim().toLowerCase()
    if (!email || email === props.profile?.email) return
    const result = await profileApi.list({ email, pageSize: 1 })
    const match: IProfile | undefined = result.responseBody?.items?.[0]
    // Ignore the answer if the email changed while we were asking.
    if (match && match.id !== props.profile?.id && form.value.email.trim().toLowerCase() === email) {
        duplicate.value = { id: match.id, name: profileFullName(match) }
    }
}

const submit = async () => {
    isSaving.value = true
    formError.value = ""
    fieldErrors.value = {}

    const values = form.value
    const years = values.yearsOfExperience.trim()
    const payload: IProfilePayload = {
        title: orNull(values.title),
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        mobile: orNull(values.mobile),
        employer: orNull(values.employer),
        jobRole: orNull(values.jobRole),
        sector: orNull(values.sector),
        highestQualification: orNull(values.highestQualification),
        yearsOfExperience: years === "" ? null : Number(years),
        stateProvince: orNull(values.stateProvince),
        country: orNull(values.country),
    }
    const result = props.profile ? await profileApi.update(props.profile.id, payload) : await profileApi.create(payload)
    isSaving.value = false

    if (result.statusCode === 409 && result.responseBody?.existingId) {
        duplicate.value = { id: result.responseBody.existingId, name: "the existing profile" }
        fieldErrors.value = { email: result.responseBody.message }
        return
    }
    if (result.statusCode !== 200 && result.statusCode !== 201) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "Please correct the highlighted fields." : (result.responseBody?.message ?? result.errorMessage ?? "Could not save the profile.")
        return
    }
    emit("saved", result.responseBody.profile)
}

defineExpose({ submit, isSaving })
</script>
