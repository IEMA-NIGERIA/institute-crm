<template>
    <FormWrapper :label="fieldLabel" :required="required" :error="error" :hint="hint" v-slot="{ id, describedBy }">
        <!-- Selected -->
        <div v-if="value" class="flex items-center justify-between gap-3 form-control">
            <div class="min-w-0">
                <p class="m-0 font-medium truncate">{{ value.label }}</p>
                <p v-if="value.description" class="m-0 text-xs text-gray-500 truncate">{{ value.description }}</p>
            </div>
            <button
                type="button"
                @click="clear"
                class="shrink-0 px-2 py-1 rounded-md bg-transparent border-none text-xs font-medium text-[#103260] cursor-pointer hover:bg-gray-100"
            >
                Change
            </button>
        </div>

        <!-- Searching -->
        <div v-else class="relative">
            <CommonIcon icon="hugeicons:search-01" :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
                :id="id"
                ref="input"
                type="text"
                role="combobox"
                autocomplete="off"
                :aria-expanded="isOpen"
                :aria-controls="`${id}-listbox`"
                :aria-activedescendant="activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined"
                :aria-invalid="!!error"
                :aria-describedby="describedBy"
                :value="query"
                :placeholder="placeholder"
                @input="onInput(($event.target as HTMLInputElement).value)"
                @keydown.down.prevent="move(1)"
                @keydown.up.prevent="move(-1)"
                @keydown.enter.prevent="activeIndex >= 0 && results[activeIndex] && select(results[activeIndex]!)"
                @keydown.esc="isOpen = false"
                @blur="isOpen = false"
                class="form-control"
                style="padding-left: 38px"
            />
            <ul
                v-if="isOpen"
                :id="`${id}-listbox`"
                role="listbox"
                class="absolute z-10 left-0 right-0 mt-1 p-1 m-0 list-none max-h-64 overflow-y-auto rounded-xl bg-white border-solid border-1 border-gray-200 shadow-lg"
            >
                <li v-if="isSearching" class="px-3 py-2.5 text-sm text-gray-500">Searching…</li>
                <li v-else-if="searchError" class="px-3 py-2.5 text-sm text-red-700">{{ searchError }}</li>
                <li v-else-if="results.length === 0" class="px-3 py-2.5 text-sm text-gray-500">No matches for “{{ query }}”</li>
                <li
                    v-else
                    v-for="(option, index) in results"
                    :id="`${id}-option-${index}`"
                    :key="option.value"
                    role="option"
                    :aria-selected="index === activeIndex"
                    @mousedown.prevent="select(option)"
                    @mouseenter="activeIndex = index"
                    class="px-3 py-2 rounded-lg cursor-pointer"
                    :class="index === activeIndex ? 'bg-gray-100' : ''"
                >
                    <p class="m-0 text-sm font-medium text-gray-900">{{ option.label }}</p>
                    <p v-if="option.description" class="m-0 text-xs text-gray-500">{{ option.description }}</p>
                </li>
            </ul>
        </div>
    </FormWrapper>
</template>
<script setup lang="ts">

export interface ISearchOption {
    value: string
    label: string
    description?: string
}

/** Search-as-you-type picker over an async `search` function. */
interface IProps {
    fieldLabel?: string
    value: ISearchOption | null
    search: (query: string) => Promise<ISearchOption[]>
    placeholder?: string
    minChars?: number
    required?: boolean
    error?: string
    hint?: string
}

const props = withDefaults(defineProps<IProps>(), {
    placeholder: "Start typing to search…",
    minChars: 2,
})
const emits = defineEmits<{ "update:value": [value: ISearchOption | null] }>()

const input = ref<HTMLInputElement | null>(null)
const query = ref("")
const results = ref<ISearchOption[]>([])
const isOpen = ref(false)
const isSearching = ref(false)
const searchError = ref("")
const activeIndex = ref(-1)

let timer: ReturnType<typeof setTimeout> | undefined
let latest = 0

const onInput = (text: string) => {
    query.value = text
    clearTimeout(timer)
    if (text.trim().length < props.minChars) {
        isOpen.value = false
        return
    }
    isOpen.value = true
    isSearching.value = true
    timer = setTimeout(async () => {
        // Ignore answers to searches that have since been superseded.
        const ticket = ++latest
        try {
            const found = await props.search(text.trim())
            if (ticket !== latest) return
            results.value = found
            searchError.value = ""
        } catch (err) {
            if (ticket !== latest) return
            searchError.value = err instanceof Error ? err.message : "Search failed"
        }
        activeIndex.value = results.value.length ? 0 : -1
        isSearching.value = false
    }, 250)
}

const move = (step: number) => {
    if (!isOpen.value || !results.value.length) return
    activeIndex.value = (activeIndex.value + step + results.value.length) % results.value.length
}

const select = (option: ISearchOption) => {
    emits("update:value", option)
    isOpen.value = false
    query.value = ""
}

const clear = async () => {
    emits("update:value", null)
    await nextTick()
    input.value?.focus()
}

onBeforeUnmount(() => clearTimeout(timer))
</script>
