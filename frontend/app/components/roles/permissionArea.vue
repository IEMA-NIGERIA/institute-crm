<template>
    <section class="box-border rounded-2xl bg-white border-solid border-1 border-gray-200 overflow-hidden">
        <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b-solid border-b-1 border-gray-100">
            <div class="flex items-center gap-2">
                <h3 class="m-0 text-sm font-semibold">{{ area.label }}</h3>
                <span class="text-xs text-gray-500 tabular-nums">{{ grantedCount }} of {{ area.permissions.length }}</span>
            </div>
            <button
                v-if="editable"
                type="button"
                @click="emit('set-all', keys, !allGranted)"
                class="px-2.5 py-1 rounded-md bg-transparent border-none text-xs font-medium text-[#103260] cursor-pointer hover:bg-gray-100"
            >
                {{ allGranted ? "Clear all" : "Select all" }}
            </button>
        </div>
        <ul class="m-0 p-0 list-none">
            <li v-for="permission in area.permissions" :key="permission.key" class="border-b-solid border-b-1 border-gray-50 last:border-b-0">
                <label
                    class="flex items-start gap-3 px-5 py-3"
                    :class="[editable ? 'cursor-pointer hover:bg-gray-50' : '', changeOf(permission.key) === 'added' ? 'bg-green-50' : changeOf(permission.key) === 'removed' ? 'bg-red-50' : '']"
                >
                    <input
                        type="checkbox"
                        :checked="selected.has(permission.key)"
                        :disabled="!editable"
                        @change="emit('toggle', permission.key, ($event.target as HTMLInputElement).checked)"
                        class="mt-0.5 w-4 h-4 shrink-0 accent-[#103260]"
                    />
                    <span class="min-w-0 flex-1">
                        <span class="block text-sm text-gray-900">{{ permission.description }}</span>
                        <code class="block mt-0.5 text-xs text-gray-500">{{ permission.key }}</code>
                    </span>
                    <CommonBadge v-if="changeOf(permission.key) === 'added'" tone="success">Adding</CommonBadge>
                    <CommonBadge v-else-if="changeOf(permission.key) === 'removed'" tone="danger">Removing</CommonBadge>
                </label>
            </li>
        </ul>
    </section>
</template>
<script setup lang="ts">
import type { IPermissionArea } from '~/composables/apiclient/user';

interface IProps {
    area: IPermissionArea
    /** Permissions ticked now. */
    selected: Set<string>
    /** Permissions the role has on the server. */
    saved: Set<string>
    editable: boolean
    /** Mark ticks that differ from `saved` (off when creating a role, where everything is new). */
    showChanges?: boolean
}

const props = withDefaults(defineProps<IProps>(), { showChanges: true })
const emit = defineEmits<{ toggle: [key: string, granted: boolean], "set-all": [keys: string[], granted: boolean] }>()

const keys = computed(() => props.area.permissions.map((p) => p.key))
const grantedCount = computed(() => keys.value.filter((k) => props.selected.has(k)).length)
const allGranted = computed(() => grantedCount.value === keys.value.length)

const changeOf = (key: string) => !props.showChanges ? null :
    props.selected.has(key) && !props.saved.has(key) ? "added" : !props.selected.has(key) && props.saved.has(key) ? "removed" : null
</script>
