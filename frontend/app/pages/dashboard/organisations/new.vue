<template>
   <div />
</template>
<script setup lang="ts">
// The create form is now a modal on the organisations list; keep old links working.
await navigateTo({ path: "/dashboard/organisations", query: { new: "1" } }, { replace: true })
</script>
