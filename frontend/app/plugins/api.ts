import { apiClient } from "~/composables/apiclient/api"

export default defineNuxtPlugin(async () => {
    const { apiBase, apiMock } = useRuntimeConfig().public
    apiClient.setBaseUrl(apiBase)
    // Loaded on demand so the mock never ships in a normal build's main bundle.
    if (apiMock && import.meta.client) {
        const { createMockHandler } = await import("~/composables/apiclient/mock")
        apiClient.mock = createMockHandler()
    }
})
