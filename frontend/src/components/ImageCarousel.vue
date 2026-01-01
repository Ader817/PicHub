<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  images: { type: Array, required: true },
  maxItems: { type: Number, default: 8 },
})

const router = useRouter()

const items = computed(() => (props.images || []).slice(0, props.maxItems))

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
  <div v-if="items.length" class="overflow-hidden rounded-lg border bg-white">
    <div class="border-b px-4 py-3 text-sm font-medium text-slate-700">轮播展示</div>
    <el-carousel :height="height" indicator-position="outside" arrow="hover" :interval="4000">
      <el-carousel-item v-for="img in items" :key="img.id">
        <button type="button" class="relative h-full w-full" @click="go(img)">
          <img
            class="h-full w-full object-contain bg-slate-50"
            :src="img.thumbnailMediumUrl || img.originalUrl"
            :alt="img.filename"
            loading="lazy"
          />
          <div class="absolute bottom-2 left-2 right-2 rounded bg-black/50 px-2 py-1 text-left text-xs text-white">
            <div class="truncate">{{ img.filename }}</div>
          </div>
        </button>
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

