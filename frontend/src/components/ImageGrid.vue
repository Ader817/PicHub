<script setup>
const props = defineProps({
  images: { type: Array, required: true },
  carouselIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['toggle-carousel'])

function inCarousel(id) {
  return props.carouselIds.includes(id)
}

function toggle(img) {
  emit('toggle-carousel', { image: img, next: !inCarousel(img.id) })
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
    <router-link
      v-for="img in images"
      :key="img.id"
      class="group overflow-hidden pg-card pg-interactive"
      :to="`/images/${img.id}`"
    >
      <div class="relative aspect-square overflow-hidden" :style="{ backgroundColor: 'var(--pg-muted)' }">
        <img
          class="h-full w-full object-cover transition group-hover:scale-[1.02]"
          :src="img.thumbnailSmallUrl || img.thumbnailMediumUrl || img.originalUrl"
          :alt="img.filename"
          loading="lazy"
        />
        <button
          type="button"
          class="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-lg font-extrabold"
          :style="{
            background: 'var(--pg-background)',
            color: inCarousel(img.id) ? 'var(--pg-secondary)' : 'var(--pg-muted-foreground)',
            boxShadow: 'var(--pg-shadow-sm)',
            border: '2px solid var(--pg-foreground)',
          }"
          :title="inCarousel(img.id) ? '移出轮播' : '加入轮播'"
          @click.prevent.stop="toggle(img)"
        >
          {{ inCarousel(img.id) ? '★' : '☆' }}
        </button>
        <div
          v-if="Number.isFinite(img.matchScore) && img.matchScore > 0"
          class="absolute left-2 top-2 rounded-full px-2 py-1 text-[11px] font-semibold"
          :style="{
            background: 'var(--pg-accent)',
            color: 'var(--pg-accent-foreground)',
            boxShadow: 'var(--pg-shadow-sm)',
            border: '2px solid var(--pg-foreground)',
          }"
        >
          相关度 {{ img.matchScore }}
        </div>
      </div>
      <div class="p-3 text-xs" :style="{ color: 'var(--pg-muted-foreground)' }">
        <div class="truncate">{{ img.filename }}</div>
      </div>
    </router-link>
  </div>
</template>
