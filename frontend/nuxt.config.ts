// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@unocss/nuxt', '@nuxtjs/google-fonts', '@pinia/nuxt'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_API_BASE / NUXT_PUBLIC_API_MOCK.
      apiBase: 'http://localhost:8080',
      // Serves profiles, organisations and auth from an in-browser mock (composables/apiclient/mock).
      apiMock: false
    }
  },
  // The dashboard is behind the auth guard, which can only check the session in the browser.
  routeRules: {
    '/dashboard': { ssr: false },
    '/dashboard/**': { ssr: false }
  },
  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700]
    }
  }
})
