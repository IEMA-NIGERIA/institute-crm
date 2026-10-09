<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface IconProps {
  icon: string
  size?: string | number
  class?: string
}

withDefaults(defineProps<IconProps>(), {
  size: 22,
  class: ''
})
</script>

<template>
  <Icon
    :icon="icon"
    :width="size"
    :height="size"
    aria-hidden="true"
    :class="class"
  />
</template>
