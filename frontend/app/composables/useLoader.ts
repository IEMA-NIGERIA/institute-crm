import { apiErrorMessage, type IHTTPResponse } from "./apiclient/api"

/** Loads one record for a page: tracks loading, error and not-found (pair with <CommonPageState>). */
export const useLoader = <T>(fetch: () => Promise<IHTTPResponse>, pick: (body: any) => T) => {
    const data = shallowRef<T | null>(null)
    const isLoading = ref(true)
    const error = ref("")
    const notFound = ref(false)

    const load = async () => {
        isLoading.value = true
        error.value = ""
        notFound.value = false
        const result = await fetch()
        isLoading.value = false
        if (result.statusCode !== 200) {
            // The API answers 400 for malformed ids; to the user that's the same as a missing record.
            notFound.value = result.statusCode === 404 || result.statusCode === 400
            error.value = apiErrorMessage(result)
            return
        }
        data.value = pick(result.responseBody)
    }

    /** Re-fetches in the background, keeping the current data on screen (and on failure). */
    const refresh = async () => {
        const result = await fetch()
        if (result.statusCode === 200) data.value = pick(result.responseBody)
    }

    return { data, isLoading, error, notFound, load, refresh }
}
