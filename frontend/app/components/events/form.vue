<template>
    <div class="max-w-3xl">
        <p v-if="formError" class="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>

        <h3 class="text-lg mt-2 mb-4">Event Details</h3>
        <div class="space-y-4">
            <FormText field-label="Title" required autocomplete="off" :value="form.title" :error="fieldErrors.title" @update:value="form.title = $event" />
            <FormChoice
                field-label="Event Type"
                required
                placeholder="Choose a type"
                :options="EVENT_TYPE_OPTIONS"
                :value="form.type"
                :error="fieldErrors.type"
                @update:value="form.type = $event"
            />
            <FormTextarea field-label="Description" :maxlength="2000" :value="form.description" :error="fieldErrors.description" @update:value="form.description = $event" />
        </div>

        <h3 class="text-lg mt-8 mb-4">Schedule</h3>
        <div class="grid md:grid-cols-2 gap-4">
            <FormText field-label="Starts" type="datetime-local" required :value="form.startsAt" :error="fieldErrors.startsAt" @update:value="form.startsAt = $event" />
            <FormText field-label="Ends" type="datetime-local" required :min="form.startsAt || undefined" :value="form.endsAt" :error="fieldErrors.endsAt" @update:value="form.endsAt = $event" />
        </div>

        <h3 class="text-lg mt-8 mb-4">Location</h3>
        <div class="space-y-4">
            <FormChoice
                field-label="Delivery"
                required
                :options="DELIVERY_MODE_OPTIONS"
                :value="form.deliveryMode"
                :error="fieldErrors.deliveryMode"
                @update:value="form.deliveryMode = $event"
            />
            <div v-if="form.deliveryMode !== 'online'" class="grid md:grid-cols-2 gap-4">
                <FormText field-label="Venue" required placeholder="e.g. IEMA Training Centre" :value="form.venueName" :error="fieldErrors.venueName" @update:value="form.venueName = $event" />
                <FormText field-label="Venue Address" :value="form.venueAddress" :error="fieldErrors.venueAddress" @update:value="form.venueAddress = $event" />
            </div>
            <FormText
                v-if="form.deliveryMode !== 'in_person'"
                field-label="Online Link"
                type="url"
                required
                placeholder="https://"
                hint="Zoom, Teams or other meeting link attendees will use to join."
                :value="form.onlineLink"
                :error="fieldErrors.onlineLink"
                @update:value="form.onlineLink = $event"
            />
        </div>

        <h3 class="text-lg mt-8 mb-4">Capacity &amp; Fees</h3>
        <div class="grid md:grid-cols-3 gap-4">
            <FormText
                field-label="Capacity"
                type="number"
                min="1"
                step="1"
                hint="Leave blank for unlimited."
                :value="form.capacity"
                :error="fieldErrors.capacity"
                @update:value="form.capacity = $event"
            />
            <FormText
                field-label="Member Fee (₦)"
                type="number"
                min="0"
                step="0.01"
                required
                hint="Enter 0 if free."
                :value="form.memberFee"
                :error="fieldErrors.memberFee"
                @update:value="form.memberFee = $event"
            />
            <FormText
                field-label="Non-member Fee (₦)"
                type="number"
                min="0"
                step="0.01"
                required
                hint="Enter 0 if free."
                :value="form.nonMemberFee"
                :error="fieldErrors.nonMemberFee"
                @update:value="form.nonMemberFee = $event"
            />
        </div>

        <div class="flex gap-3 mt-8">
            <CommonButton title="Create Event" loading-title="Creating…" :block="false" :is-loading="isSaving" @on-click="submit" />
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isSaving" @on-click="navigateTo('/dashboard/events')" />
        </div>
    </div>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import { DELIVERY_MODE_OPTIONS, EVENT_TYPE_OPTIONS, eventApi, type IEventPayload } from '~/composables/apiclient/event';

const form = ref({
    title: "",
    type: "",
    description: "",
    startsAt: "",
    endsAt: "",
    deliveryMode: "in_person",
    venueName: "",
    venueAddress: "",
    onlineLink: "",
    capacity: "",
    memberFee: "",
    nonMemberFee: "",
})
const isSaving = ref(false)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})

const orNull = (value: string) => value.trim() || null
const toNumber = (value: string) => (value.trim() === "" ? null : Number(value))
// datetime-local values are in the user's time zone; the API takes ISO timestamps.
const toIso = (value: string) => (value ? new Date(value).toISOString() : "")

const submit = async () => {
    formError.value = ""
    fieldErrors.value = {}
    const values = form.value
    if (values.startsAt && values.endsAt && values.endsAt <= values.startsAt) {
        fieldErrors.value.endsAt = "The event must end after it starts"
        return
    }

    const isOnline = values.deliveryMode === "online"
    const isInPerson = values.deliveryMode === "in_person"
    const payload: IEventPayload = {
        title: values.title,
        type: values.type,
        description: orNull(values.description),
        startsAt: toIso(values.startsAt),
        endsAt: toIso(values.endsAt),
        deliveryMode: values.deliveryMode,
        venueName: isOnline ? null : orNull(values.venueName),
        venueAddress: isOnline ? null : orNull(values.venueAddress),
        onlineLink: isInPerson ? null : orNull(values.onlineLink),
        capacity: toNumber(values.capacity),
        // Sent as null when blank so the API can say they're required.
        memberFee: toNumber(values.memberFee) as number,
        nonMemberFee: toNumber(values.nonMemberFee) as number,
    }

    isSaving.value = true
    const result = await eventApi.create(payload)
    isSaving.value = false
    if (result.statusCode !== 201 && result.statusCode !== 200) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "Please correct the highlighted fields." : apiErrorMessage(result, "Could not create the event.")
        return
    }
    await navigateTo({ path: "/dashboard/events", query: { created: result.responseBody.event.title } })
}
</script>
