<template>
    <CommonModal :open="open" title="New role" description="Name the role and choose what people with it can do." size="lg" @close="!isSaving && emit('close')">
        <div class="space-y-4">
            <p v-if="formError" class="m-0 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{{ formError }}</p>

            <FormText
                field-label="Role Name"
                required
                autocomplete="off"
                placeholder="e.g. Events coordinator"
                :hint="titleHint"
                :value="title"
                :error="fieldErrors.title"
                @update:value="setTitle"
            />
            <FormTextarea
                field-label="Description"
                placeholder="What is this role responsible for?"
                :maxlength="255"
                :value="description"
                :error="fieldErrors.description"
                @update:value="description = $event"
            />

            <div>
                <div class="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p class="form-label m-0">Permissions</p>
                        <p class="m-0 text-xs text-gray-500">{{ selected.size }} of {{ catalog.length }} selected. You can change these later.</p>
                    </div>
                    <FormChoice
                        class="w-full sm:w-64"
                        aria-label="Copy permissions from"
                        placeholder="Copy permissions from…"
                        :options="copyOptions"
                        value=""
                        @update:value="copyFrom($event)"
                    />
                </div>
                <CommonSearchInput v-model="search" placeholder="Search permissions" :debounce-ms="150" class="mt-3" />
                <p v-if="fieldErrors.permissions" class="form-error">{{ fieldErrors.permissions }}</p>
                <div class="space-y-3 mt-3">
                    <RolesPermissionArea
                        v-for="area in visibleAreas"
                        :key="area.key"
                        :area="area"
                        :selected="selected"
                        :saved="selected"
                        :show-changes="false"
                        editable
                        @toggle="toggle"
                        @set-all="setAll"
                    />
                    <p v-if="!visibleAreas.length" class="m-0 py-4 text-sm text-gray-500 text-center">No permissions match “{{ search }}”.</p>
                </div>
            </div>
        </div>
        <template #footer>
            <CommonButton title="Cancel" variant="secondary" :block="false" :disabled="isSaving" @on-click="emit('close')" />
            <CommonButton title="Create Role" loading-title="Creating…" :block="false" :is-loading="isSaving" @on-click="submit" />
        </template>
    </CommonModal>
</template>
<script setup lang="ts">
import { apiErrorMessage } from '~/composables/apiclient/api';
import {
    groupPermissions,
    normaliseRoleTitle,
    roleApi,
    roleLabel,
    type IPermissionDefinition,
    type IRole,
} from '~/composables/apiclient/user';

interface IProps {
    open: boolean
    catalog: IPermissionDefinition[]
    /** Existing roles: to copy permissions from and to catch duplicate names. */
    roles: IRole[]
}

const props = defineProps<IProps>()
const emit = defineEmits<{ close: [], created: [role: IRole] }>()

const title = ref("")
const description = ref("")
const selected = ref(new Set<string>())
const search = ref("")
const isSaving = ref(false)
const formError = ref("")
const fieldErrors = ref<Record<string, string>>({})

watch(() => props.open, (open) => {
    if (!open) return
    title.value = ""
    description.value = ""
    selected.value = new Set()
    search.value = ""
    formError.value = ""
    fieldErrors.value = {}
})

const setTitle = (value: string) => {
    title.value = value
    delete fieldErrors.value.title
}

const titleHint = computed(() => {
    const name = normaliseRoleTitle(title.value)
    return name ? `Shown as “${roleLabel(name)}”.` : undefined
})

const copyOptions = computed(() => props.roles.map((role) => ({ value: role.id, label: `${roleLabel(role.title)} (${role.permissions.length})` })))

const visibleAreas = computed(() => {
    const term = search.value.toLowerCase()
    return groupPermissions(term
        ? props.catalog.filter((p) => p.key.toLowerCase().includes(term) || p.description.toLowerCase().includes(term))
        : props.catalog)
})

const toggle = (key: string, granted: boolean) => setAll([key], granted)

const setAll = (keys: string[], granted: boolean) => {
    const next = new Set(selected.value)
    for (const key of keys) {
        if (granted) next.add(key)
        else next.delete(key)
    }
    selected.value = next
}

const copyFrom = (roleId: string) => {
    const role = props.roles.find((r) => r.id === roleId)
    if (role) selected.value = new Set(role.permissions)
}

const submit = async () => {
    formError.value = ""
    fieldErrors.value = {}
    const name = normaliseRoleTitle(title.value)
    if (name.length < 2) fieldErrors.value.title = "Give the role a name"
    else if (props.roles.some((r) => r.title === name)) fieldErrors.value.title = "A role with this name already exists"
    if (Object.keys(fieldErrors.value).length) return

    isSaving.value = true
    const result = await roleApi.create({ title: name, description: description.value.trim() || null, permissions: [...selected.value] })
    isSaving.value = false
    if (result.statusCode === 409) {
        fieldErrors.value.title = "A role with this name already exists"
        return
    }
    if (result.statusCode !== 201 && result.statusCode !== 200) {
        const details: { path: string, message: string }[] = result.responseBody?.details ?? []
        for (const detail of details) fieldErrors.value[detail.path] ??= detail.message
        formError.value = details.length ? "Please correct the highlighted fields." : apiErrorMessage(result, "Could not create the role.")
        return
    }
    emit("created", result.responseBody.role)
}
</script>
