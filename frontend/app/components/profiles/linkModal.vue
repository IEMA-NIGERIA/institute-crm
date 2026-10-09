<template>
    <CommonModal
        :open="open"
        :title="mode === 'profile' ? 'Link organisation' : 'Add profile'"
        :description="mode === 'profile' ? `Link ${fixedName} to an organisation, with their role there.` : `Link a profile to ${fixedName}, with their role there.`"
        @close="emit('close')"
    >
        <div class="space-y-4">
            <p v-if="formError" class="m-0 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>
            <FormSearchSelect
                :field-label="mode === 'profile' ? 'Organisation' : 'Profile'"
                required
                :placeholder="mode === 'profile' ? 'Search organisations by name or RC number' : 'Search profiles by name, email or phone'"
                :search="search"
                :value="selected"
                :error="fieldErrors.profileId ?? fieldErrors.organisationId"
                @update:value="selected = $event"
            />
            <FormChoice
                field-label="Role"
                required
                placeholder="Choose a role"
                :options="AFFILIATION_ROLE_OPTIONS"
                :value="role"
                :error="fieldErrors.role"
                @update:value="role = $event"
            />
            <FormText field-label="Since" type="date" :value="since" :error="fieldErrors.since" @update:value="since = $event" />
        </div>
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isSaving" @on-click="emit('close')" />
            <CommonButton title="Link" loading-title="Linking…" :block="false" :is-loading="isSaving" @on-click="submit" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">
import type { ISearchOption } from '~/components/form/searchSelect.vue';
import { apiErrorMessage } from '~/composables/apiclient/api';
import { organisationApi, type IOrganisation } from '~/composables/apiclient/organisation';
import { affiliationApi, AFFILIATION_ROLE_OPTIONS, profileApi, profileFullName, type IProfile } from '~/composables/apiclient/profile';

/** Links a profile and an organisation. `mode` says which side is fixed (the page we're on). */
interface IProps {
    open: boolean
    mode: "profile" | "organisation"
    profile?: IProfile
    organisation?: IOrganisation
}

const props = defineProps<IProps>()
const emit = defineEmits<{ close: [], linked: [] }>()

const selected = ref<ISearchOption | null>(null)
const role = ref("")
const since = ref("")
const isSaving = ref(false)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})

const fixedName = computed(() => props.mode === "profile" ? (props.profile ? profileFullName(props.profile) : "") : props.organisation?.name ?? "")

// Start fresh each time the modal opens.
watch(() => props.open, (open) => {
    if (!open) return
    selected.value = null
    role.value = ""
    since.value = ""
    formError.value = ""
    fieldErrors.value = {}
})

const search = async (query: string): Promise<ISearchOption[]> => {
    if (props.mode === "profile") {
        const result = await organisationApi.list({ search: query, pageSize: 8 })
        if (result.statusCode !== 200) throw new Error(apiErrorMessage(result, "Search failed"))
        return (result.responseBody.items as IOrganisation[]).map((o) => ({
            value: o.id, label: o.name, description: [o.registrationReference, o.city].filter(Boolean).join(" · ") || undefined,
        }))
    }
    const result = await profileApi.list({ search: query, pageSize: 8 })
    if (result.statusCode !== 200) throw new Error(apiErrorMessage(result, "Search failed"))
    return (result.responseBody.items as IProfile[]).map((p) => ({ value: p.id, label: profileFullName(p), description: p.email }))
}

const submit = async () => {
    formError.value = ""
    fieldErrors.value = {}
    if (!selected.value) fieldErrors.value[props.mode === "profile" ? "organisationId" : "profileId"] = `Choose ${props.mode === "profile" ? "an organisation" : "a profile"}`
    if (!role.value) fieldErrors.value.role = "Choose a role"
    if (Object.keys(fieldErrors.value).length) return

    isSaving.value = true
    const result = await affiliationApi.create({
        profileId: props.mode === "profile" ? props.profile!.id : selected.value!.value,
        organisationId: props.mode === "profile" ? selected.value!.value : props.organisation!.id,
        role: role.value,
        since: since.value || null,
    })
    isSaving.value = false
    if (result.statusCode !== 201 && result.statusCode !== 200) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "" : apiErrorMessage(result, "Could not create the link.")
        return
    }
    emit("linked")
}
</script>
