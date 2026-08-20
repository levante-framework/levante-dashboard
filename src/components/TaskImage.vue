<!--
  Renders a task cover image with WebP preference and Levante logo fallback.
  Pass the raw Firestore `task.image` value (URL, path, or bare filename).
  See `src/helpers/taskImage.ts` for resolution rules.
-->
<template>
  <img :src="resolved.src" :alt="alt" v-bind="$attrs" @error="onTaskImageError($event, resolved.fallbackSrc)" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { onTaskImageError, resolveTaskImage } from '@/helpers/taskImage';

defineOptions({ inheritAttrs: false });

interface Props {
  /** Raw task image from Firestore (full URL, path, or bare filename). */
  image?: string | null;
  alt?: string;
}

const props = withDefaults(defineProps<Props>(), {
  image: null,
  alt: '',
});

const resolved = computed(() => resolveTaskImage(props.image));
</script>
