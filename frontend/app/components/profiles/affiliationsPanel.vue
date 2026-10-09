<template>
    <div>
        <CommonDataTable
            :title="mode === 'profile' ? 'Organisations' : 'Linked profiles'"
            :columns="columns"
            :rows="affiliations"
            :total="affiliations.length"
            :page-size="affiliations.length || 1"
            :is-loading="isLoading"
            :error="error"
            error-title="Couldn't load links"
            :empty-title="mode === 'profile' ? 'Not linked to any organisation' : 'No profiles linked yet'"
            :empty-text="mode === 'profile' ? 'Link this person to their employer or an organisation they represent.' : 'Link the people who represent or work for this organisation.'"
            :empty-icon="mode === 'profile' ? 'hugeicons:building-03' : 'hugeicons:user-account'"
            @retry="load"
        >
            <template v-if="canWrite" #actions>
                <CommonButton :title="mode === 'profile' ? 'Link organisation' : 'Add profile'" :block="false" @on-click="isLinking = true" />
            </template>
            <template #row="{ row: affiliation }">
                <td class="px-5 py-3.5">
                    <template v-if="mode === 'profile'">
                        <NuxtLink :to="`/dashboard/organisations/${affiliation.organisation.id}`" class="font-medium text-gray-900 no-underline hover:underline">{{ affiliation.organisation.name }}</NuxtLink>
                    </template>
                    <template v-else>
                        <NuxtLink :to="`/dashboard/profiles/${affiliation.profile.id}`" class="font-medium text-gray-900 no-underline hover:underline">{{ profileFullName(affiliation.profile) }}</NuxtLink>
                        <p class="m-0 text-xs text-gray-500">{{ affiliation.profile.email }}</p>
                    </template>
                </td>
                <td class="px-5 py-3.5">
                    <CommonBadge :tone="affiliation.role === 'nominated_representative' ? 'info' : 'neutral'">{{ labelFor(AFFILIATION_ROLE_OPTIONS, affiliation.role) }}</CommonBadge>
                </td>
                <td class="px-5 py-3.5 text-gray-500 whitespace-nowrap">{{ affiliation.since ? formatDate(affiliation.since) : "—" }}</td>
                <td v-if="canWrite" class="px-5 py-3.5 text-right">
                    <button
                        type="button"
                        @click="unlinking = affiliation"
                        class="px-3 py-1.5 rounded-lg bg-transparent border-none text-sm font-medium text-red-700 cursor-pointer hover:bg-red-50"
                    >
                        Unlink
                    </button>
                </td>
            </template>
        </CommonDataTable>

        <ProfilesLinkModal
            :open="isLinking"
            :mode="mode"
            :profile="profile"
            :organisation="organisation"
            @close="isLinking = false"
            @linked="onChanged(() => { isLinking = false })"
        />

        <CommonConfirmDialog
            :open="unlinking !== null"
            title="Remove this link?"
            :message="unlinkMessage"
            confirm-label="Unlink"
            danger
            :is-loading="isUnlinking"
            :error="unlinkError"
            @close="unlinking = null"
            @confirm="unlink"
        />
    </div>
</template>
<script setup lang="ts">
import { apiErrorMessage, type IHTTPResponse } from '~/composables/apiclient/api';
import { organisationApi, type IOrganisation } from '~/composables/apiclient/organisation';
import { affiliationApi, AFFILIATION_ROLE_OPTIONS, profileApi, profileFullName, type IAffiliation, type IProfile } from '~/composables/apiclient/profile';
import { formatDate, labelFor } from '~/composables/format';
import { useAuthStore } from '~/stores/auth';

/** Profile ↔ organisation links, shown from either side. */
interface IProps {
    mode: "profile" | "organisation"
    profile?: IProfile
    organisation?: IOrganisation
}

const props = defineProps<IProps>()
const emit = defineEmits<{ changed: [] }>()

const auth = useAuthStore()
const canWrite = computed(() => auth.can("persons:write"))

const columns = computed(() => [props.mode === "profile" ? "Organisation" : "Profile", "Role", "Since", ...(canWrite.value ? [""] : [])])

const affiliations = ref<IAffiliation[]>([])
const isLoading = ref(true)
const error = ref("")
const isLinking = ref(false)
const unlinking = ref<IAffiliation | null>(null)
const isUnlinking = ref(false)
const unlinkError = ref("")

const unlinkMessage = computed(() => {
    const a = unlinking.value
    if (!a) return ""
    return `${profileFullName(a.profile)} will no longer be listed as ${labelFor(AFFILIATION_ROLE_OPTIONS, a.role)} at ${a.organisation.name}. Neither record is deleted.`
})

const load = async () => {
    isLoading.value = true
    error.value = ""
    const result: IHTTPResponse = props.mode === "profile"
        ? await profileApi.organisations(props.profile!.id)
        : await organisationApi.profiles(props.organisation!.id)
    isLoading.value = false
    if (result.statusCode !== 200) {
        error.value = apiErrorMessage(result)
        return
    }
    affiliations.value = result.responseBody.items
}

const onChanged = async (after: () => void) => {
    after()
    emit("changed")
    await load()
}

const unlink = async () => {
    if (!unlinking.value) return
    isUnlinking.value = true
    unlinkError.value = ""
    const result = await affiliationApi.remove(unlinking.value.id)
    isUnlinking.value = false
    if (result.statusCode !== 204 && result.statusCode !== 200) {
        unlinkError.value = apiErrorMessage(result, "Could not remove the link.")
        return
    }
    await onChanged(() => { unlinking.value = null })
}

onMounted(load)
</script>
