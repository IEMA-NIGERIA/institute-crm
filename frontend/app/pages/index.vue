<template>
    <NuxtLayout 
        name="auth-layout"
        title="Welcome Back"
        subtitle="Sign in with your IEMA work account to continue."
    >
        <div class="max-w-xl m-auto space-y-4">
            
            <FormText 
                field-label="Email Address"
                type="email"
                :value="payload.email"
                @update:value="payload.email = $event"
            />

            <FormPassword 
                field-label="Password"
                :value="payload.password"
                @update:value="payload.password = $event"
            />

            <p v-if="errorMessage" class="text-sm text-red-700">{{ errorMessage }}</p>

            <br />
            <CommonButton
                title="Submit"
                :is-loading="isLoading"
                @on-click="submit"
            />
        </div>
    </NuxtLayout>
</template>
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore()
const route = useRoute()

const isLoading = ref(false)
const errorMessage = ref("")
const payload = ref({
    email:"",
    password:""
})


const submit = async () =>{
    isLoading.value = true;
    errorMessage.value = ""
    const error = await auth.login(payload.value)
    isLoading.value = false
    if(error){
        errorMessage.value = error
        return
    }
    // Only follow redirects back into the dashboard, never to an arbitrary URL.
    const redirect = route.query.redirect
    const target = typeof redirect === "string" && redirect.startsWith("/dashboard") ? redirect : "/dashboard"
    navigateTo(target)
}
</script>