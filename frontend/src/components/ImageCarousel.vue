<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  images: { type: Array, required: true },
  selectedImages: { type: Array, default: () => [] },
  maxItems: { type: Number, default: 8 },
})

const router = useRouter()

const items = computed(() => {
  const selected = Array.isArray(props.selectedImages) ? props.selectedImages : []
  if (selected.length) return selected.slice(0, 20)
  return (props.images || []).slice(0, props.maxItems)
})

const isSelectedMode = computed(() => Array.isArray(props.selectedImages) && props.selectedImages.length > 0)

const height = ref('240px')

function updateHeight() {
  const w = window.innerWidth || 0
  height.value = w < 768 ? '220px' : '360px'
}

onMounted(() => {
  updateHeight()
  window.addEventListener('resize', updateHeight, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateHeight)
})

function go(img) {
  router.push(`/images/${img.id}`)
}
</script>

<template>
  <div v-if="items.length" class="overflow-hidden pg-card">
    <div class="border-b-2 px-4 py-3 text-sm font-extrabold" :style="{ borderColor: 'var(--pg-foreground)' }">
      <div class="flex flex-wrap items-center gap-2">
        <div>轮播展示</div>
        <div class="text-xs font-semibold" :style="{ color: 'var(--pg-muted-foreground)' }">
          {{ isSelectedMode ? '精选轮播（你已选择）' : '默认轮播（从下方点 ★ 选择最多 20 张）' }}
        </div>
      </div>
    </div>
    <el-carousel :height="height" indicator-position="outside" arrow="hover" :interval="4000">
      <el-carousel-item v-for="img in items" :key="img.id">
        <button type="button" class="relative h-full w-full" @click="go(img)">
          <img
            class="h-full w-full object-contain"
            :style="{ backgroundColor: 'var(--pg-background)' }"
            :src="img.thumbnailMediumUrl || img.originalUrl"
            :alt="img.filename"
            loading="lazy"
          />
          <div class="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-left text-xs text-white">
            <div class="truncate">{{ img.filename }}</div>
          </div>
        </button>
      </el-carousel-item>
    </el-carousel>
  </div>
</template>
