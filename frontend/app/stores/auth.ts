import { defineStore } from "pinia"
import { authApi, type IAuthUser, type ILoginPayload } from "~/composables/apiclient/auth"

export const useAuthStore = defineStore("auth", () => {
    const user = ref<IAuthUser | null>(null)
    // Whether we've asked the backend for the current session yet.
    const checked = ref(false)

    const isAuthenticated = computed(() => user.value !== null)

    /** UI hint only: the API enforces every permission itself. */
    const can = (permission: string) => user.value?.role?.permissions?.includes(permission) ?? false

    const login = async (payload: ILoginPayload): Promise<string | null> => {
        const result = await authApi.login(payload)
        if (result.statusCode !== 200) {
            return result.responseBody?.message ?? result.errorMessage ?? "login failed"
        }
        user.value = result.responseBody.user
        checked.value = true
        return null
    }

    /** Resolves the session from the httpOnly cookie. Only hits the API once per page load. */
    const fetchUser = async (): Promise<IAuthUser | null> => {
        if (checked.value) return user.value
        const result = await authApi.me()
        user.value = result.statusCode === 200 ? result.responseBody.user : null
        checked.value = true
        return user.value
    }

    /** Re-reads the signed-in user, e.g. after their role's permissions change. */
    const refresh = async () => {
        checked.value = false
        return fetchUser()
    }

    const logout = async () => {
        await authApi.logout()
        user.value = null
        checked.value = true
    }

    return { user, checked, isAuthenticated, can, login, fetchUser, refresh, logout }
})
