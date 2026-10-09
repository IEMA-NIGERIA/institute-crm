import { useAuthStore } from "~/stores/auth"

export default defineNuxtRouteMiddleware(async (to) => {
    // The session cookie belongs to the API origin, so the session can only be checked from the browser.
    // Dashboard routes are client-rendered (see routeRules in nuxt.config.ts) so they never render on the server.
    if (import.meta.server) return

    const isDashboard = to.path === "/dashboard" || to.path.startsWith("/dashboard/")
    const isLogin = to.path === "/"
    if (!isDashboard && !isLogin) return

    const auth = useAuthStore()
    const user = await auth.fetchUser()

    if (isDashboard && !user) {
        return navigateTo({ path: "/", query: to.fullPath !== "/dashboard" ? { redirect: to.fullPath } : undefined })
    }
    if (isLogin && user) {
        return navigateTo("/dashboard")
    }
})
