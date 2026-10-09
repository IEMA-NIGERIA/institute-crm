<template>
    <CommonModal
        :open="open"
        title="New user"
        description="Create a staff account. Their role decides what they can see and do."
        size="lg"
        @close="!isSaving && emit('close')"
    >
        <div class="space-y-4">
            <p v-if="formError" class="m-0 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>

            <div class="grid sm:grid-cols-2 gap-4">
                <FormText field-label="First Name" required autocomplete="off" :value="form.firstName" :error="fieldErrors.firstName" @update:value="setField('firstName', $event)" />
                <FormText field-label="Last Name" required autocomplete="off" :value="form.lastName" :error="fieldErrors.lastName" @update:value="setField('lastName', $event)" />
            </div>
            <FormText
                field-label="Work Email"
                type="email"
                required
                autocomplete="off"
                hint="They'll use this to sign in."
                :value="form.email"
                :error="fieldErrors.email"
                @update:value="setField('email', $event)"
            />
            <FormChoice
                field-label="Role"
                required
                placeholder="Choose a role"
                :options="roleOptions(roles)"
                :value="form.roleTitle"
                :error="fieldErrors.roleTitle"
                :hint="selectedRole?.description ?? undefined"
                @update:value="setField('roleTitle', $event)"
            />

            <div>
                <FormPassword
                    field-label="Temporary Password"
                    required
                    autocomplete="new-password"
                    :hint="`At least ${PASSWORD_RULES.minLength} characters. Share it with them securely, not by email.`"
                    :value="form.password"
                    :error="fieldErrors.password"
                    @update:value="setField('password', $event)"
                />
                <div class="flex flex-wrap items-center gap-2 mt-2">
                    <button
                        type="button"
                        @click="setField('password', generatePassword())"
                        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50"
                    >
                        <CommonIcon icon="hugeicons:magic-wand-01" :size="16" /> Generate
                    </button>
                    <button
                        type="button"
                        :disabled="!form.password"
                        @click="copyPassword"
                        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-solid border-1 border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CommonIcon :icon="copied ? 'hugeicons:tick-02' : 'hugeicons:copy-01'" :size="16" /> {{ copied ? "Copied" : "Copy" }}
                    </button>
                </div>
            </div>
        </div>
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isSaving" @on-click="emit('close')" />
            <CommonButton title="Create User" loading-title="Creating…" :block="false" :is-loading="isSaving" @on-click="submit" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import {
    generatePassword,
    PASSWORD_RULES,
    passwordProblem,
    roleOptions,
    userApi,
    type IRole,
    type IStaffUser,
} from '~/composables/apiclient/user';

const props = defineProps<{ open: boolean, roles: IRole[] }>()
const emit = defineEmits<{ close: [], created: [user: IStaffUser] }>()

const emptyForm = () => ({ firstName: "", lastName: "", email: "", roleTitle: "", password: "" })

const form = ref(emptyForm())
const isSaving = ref(false)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})
const copied = ref(false)

// Start fresh each time it opens.
watch(() => props.open, (open) => {
    if (!open) return
    form.value = emptyForm()
    formError.value = ""
    fieldErrors.value = {}
    copied.value = false
})

type Field = keyof ReturnType<typeof emptyForm>

/** Updates a field and drops its now-stale error. */
const setField = (key: Field, value: string) => {
    form.value[key] = value
    delete fieldErrors.value[key]
    if (key === "password") copied.value = false
}

const selectedRole = computed(() => props.roles.find((role) => role.title === form.value.roleTitle))

const copyPassword = async () => {
    try {
        await navigator.clipboard.writeText(form.value.password)
        copied.value = true
    } catch {
        formError.value = "Couldn't copy to the clipboard — select the password and copy it instead."
    }
}

const submit = async () => {
    formError.value = ""
    fieldErrors.value = {}
    const values = form.value
    // A user without a role can sign in but do nothing, so the form insists on one.
    if (!values.roleTitle) fieldErrors.value.roleTitle = "Choose a role"
    const problem = passwordProblem(values.password)
    if (problem) fieldErrors.value.password = problem
    if (Object.keys(fieldErrors.value).length) return

    isSaving.value = true
    const result = await userApi.create(values)
    isSaving.value = false
    if (result.statusCode === 409) {
        fieldErrors.value.email = result.responseBody?.message ?? "A user with this email already exists"
        return
    }
    if (result.statusCode !== 201 && result.statusCode !== 200) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "Please correct the highlighted fields." : apiErrorMessage(result, "Could not create the user.")
        return
    }
    emit("created", result.responseBody.user)
}
</script>
