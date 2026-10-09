<template>
   <div />
</template>
<script setup lang="ts">
// The create form is now a modal on the enquiries list; keep old links working.
await navigateTo({ path: "/dashboard/tickets", query: { new: "1" } }, { replace: true })
</script>
