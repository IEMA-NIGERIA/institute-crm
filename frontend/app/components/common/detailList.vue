<template>
    <div class="space-y-4">
        <section
            v-for="section in sections"
            :key="section.title"
            class="box-border p-5 rounded-2xl bg-white border-solid border-1 border-gray-200"
        >
            <h3 class="m-0 mb-4 text-xs font-semibold tracking-wider uppercase text-gray-500">{{ section.title }}</h3>
            <dl class="m-0 grid sm:grid-cols-2 gap-x-6 gap-y-4">
                <div v-for="row in section.rows" :key="row.label" :class="{ 'sm:col-span-2': row.wide }">
                    <dt class="text-xs text-gray-500">{{ row.label }}</dt>
                    <dd class="m-0 mt-1 text-sm text-gray-900 break-words">
                        <a v-if="hasValue(row.value) && row.href" :href="row.href" :target="row.external ? '_blank' : undefined" :rel="row.external ? 'noopener noreferrer' : undefined" class="text-[#103260] no-underline hover:underline">{{ row.value }}</a>
                        <template v-else-if="hasValue(row.value)">{{ row.value }}</template>
                        <span v-else class="text-gray-400">—</span>
                    </dd>
                </div>
            </dl>
        </section>
    </div>
</template>
<script setup lang="ts">

export interface IDetailRow {
    label: string
    value: string | number | null | undefined
    href?: string
    /** Opens the link in a new tab. */
    external?: boolean
    /** Spans both columns. */
    wide?: boolean
}

export interface IDetailSection {
    title: string
    rows: IDetailRow[]
}

defineProps<{ sections: IDetailSection[] }>()

const hasValue = (value: IDetailRow["value"]) => value !== null && value !== undefined && value !== ""
</script>
