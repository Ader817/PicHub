<script setup>
defineProps({
  images: { type: Array, required: true },
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
    <router-link
      v-for="img in images"
      :key="img.id"
      class="group overflow-hidden rounded-lg border bg-white"
      :to="`/images/${img.id}`"
    >
      <div class="aspect-square overflow-hidden bg-slate-100">
        <img
          class="h-full w-full object-cover transition group-hover:scale-[1.02]"
          :src="img.thumbnailSmallUrl || img.thumbnailMediumUrl || img.originalUrl"
          :alt="img.filename"
          loading="lazy"
        />
      </div>
      <div class="p-2 text-xs text-slate-600">
        <div class="truncate">{{ img.filename }}</div>
      </div>
    </router-link>
  </div>
</template>

