<template>
    <div class="max-w-5xl m-auto p-12 h-screen box-border">
        <nav class="">
            <div class="">
                <img
                    class="w-25 h-15"
                    src="/iema_institute_logo.jpg" />
            </div>
        </nav>
        <div class="max-w-xl m-auto mt-12 md:mt-32">
            <h3 class="text-2xl md:text-5xl m-0">{{ title }}</h3>
            <p class="text-xl">{{ subtitle }}</p>

            <div class="mt-8">
                <slot />
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">

const props = defineProps(["title", "subtitle"])
</script>
