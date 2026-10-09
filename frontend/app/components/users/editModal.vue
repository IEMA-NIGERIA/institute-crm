<template>
    <CommonModal :open="open" :title="user ? `Edit ${user.firstName} ${user.lastName}` : 'Edit user'" :description="user?.email" @close="!isSaving && emit('close')">
        <div class="space-y-4">
            <p v-if="formError" class="m-0 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>
            <p v-if="isSelf" class="m-0 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
                This is your own account. Ask another administrator to change your role or deactivate it, so you can't lock yourself out.
            </p>
            <FormChoice
                field-label="Role"
                placeholder="No role"
                clearable
                :options="roleOptions(roles)"
                :value="roleTitle"
                :error="fieldErrors.roleTitle"
                :hint="roleTitle ? undefined : 'Without a role this user can sign in but do nothing.'"
                @update:value="roleTitle = $event"
            />
            <label
                class="flex items-start gap-3 p-3 rounded-xl border-solid border-1 border-[#D9D4CB] cursor-pointer"
                :class="{ 'opacity-60 cursor-not-allowed': isSelf }"
            >
                <input v-model="isActive" type="checkbox" :disabled="isSelf" class="mt-0.5 w-4 h-4 accent-[#103260]" />
                <span>
                    <span class="block text-sm font-medium">Account active</span>
                    <span class="block text-xs text-gray-500">Deactivated users can't sign in. Their records and history are kept.</span>
                </span>
            </label>
        </div>
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isSaving" @on-click="emit('close')" />
            <CommonButton title="Save" loading-title="Saving…" :block="false" :is-loading="isSaving" :disabled="isSelf || !hasChanges" @on-click="submit" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import { roleOptions, userApi, type IRole, type IStaffUser, type IUpdateUserPayload } from '~/composables/apiclient/user';
import { useAuthStore } from '~/stores/auth';

interface IProps {
    open: boolean
    user: IStaffUser | null
    roles: IRole[]
}

const props = defineProps<IProps>()
const emit = defineEmits<{ close: [], saved: [user: IStaffUser] }>()

const auth = useAuthStore()

const roleTitle = ref("")
const isActive = ref(true)
const isSaving = ref(false)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})

const isSelf = computed(() => props.user?.id === auth.user?.id)
const hasChanges = computed(() => !!props.user && (roleTitle.value !== (props.user.role?.title ?? "") || isActive.value !== props.user.isActive))

watch(() => props.open, (open) => {
    if (!open || !props.user) return
    roleTitle.value = props.user.role?.title ?? ""
    isActive.value = props.user.isActive
    formError.value = ""
    fieldErrors.value = {}
})

const submit = async () => {
    if (!props.user) return
    const payload: IUpdateUserPayload = {}
    if (roleTitle.value !== (props.user.role?.title ?? "")) payload.roleTitle = roleTitle.value || null
    if (isActive.value !== props.user.isActive) payload.isActive = isActive.value

    isSaving.value = true
    formError.value = ""
    fieldErrors.value = {}
    const result = await userApi.update(props.user.id, payload)
    isSaving.value = false
    if (result.statusCode !== 200) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "" : apiErrorMessage(result, "Could not save the changes.")
        return
    }
    emit("saved", result.responseBody.user)
}
</script>
