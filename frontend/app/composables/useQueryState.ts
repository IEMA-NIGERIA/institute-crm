import type { LocationQuery } from "vue-router"

const first = (value: LocationQuery[string] | undefined) => (typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "")

/**
 * List-page state (search, filters, page) kept in the URL query, so views can be
 * bookmarked and survive a refresh. Changing anything other than `page` resets to page 1.
 */
export const useQueryState = <K extends string>(keys: readonly K[]) => {
    const route = useRoute()
    const router = useRouter()

    const state = computed(() => Object.fromEntries(keys.map((key) => [key, first(route.query[key])])) as Record<K, string>)
    const page = computed(() => Math.max(1, Number(first(route.query.page)) || 1))
    const isFiltered = computed(() => keys.some((key) => state.value[key] !== ""))

    const replace = (patch: Record<string, string | number | undefined>) => {
        const query: LocationQuery = { ...route.query }
        for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === "" || (key === "page" && value === 1)) delete query[key]
            else query[key] = String(value)
        }
        return router.replace({ query })
    }

    return {
        state,
        page,
        isFiltered,
        set: (patch: Partial<Record<K, string>>) => replace({ ...patch, page: undefined }),
        setPage: (value: number) => replace({ page: value }),
        clear: () => replace(Object.fromEntries([...keys, "page"].map((key) => [key, undefined]))),
    }
}

/** The active tab, kept in `?tab=` (omitted for the first tab). */
export const useQueryTab = (keys: readonly string[]) => {
    const route = useRoute()
    const router = useRouter()
    return computed({
        get: () => {
            const tab = first(route.query.tab)
            return keys.includes(tab) ? tab : keys[0]!
        },
        set: (tab: string) => router.replace({ query: { ...route.query, tab: tab === keys[0] ? undefined : tab } }),
    })
}
