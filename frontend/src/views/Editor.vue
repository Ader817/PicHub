<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import VueCropper from 'vue-cropperjs'
import AppShell from '../components/AppShell.vue'
import { api } from '../lib/api'

const route = useRoute()
const router = useRouter()
const imageId = computed(() => Number(route.params.id))

const image = ref(null)
const cropperRef = ref(null)

const tune = ref({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
})

const cssFilter = computed(() => {
  const b = Math.round(tune.value.brightness)
  const c = Math.round(tune.value.contrast)
  const s = Math.round(tune.value.saturation)
  const h = Math.round(tune.value.hue)
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg)`
})

async function load() {
  const { data } = await api.get(`/images/${imageId.value}`)
  image.value = data.image
}

function rotate() {
  cropperRef.value?.cropper?.rotate(90)
}

function resetTune() {
  tune.value = { brightness: 100, contrast: 100, saturation: 100, hue: 0 }
}

async function save() {
  const canvas = cropperRef.value?.cropper?.getCroppedCanvas()
  if (!canvas) return
  const tunedCanvas = document.createElement('canvas')
  tunedCanvas.width = canvas.width
  tunedCanvas.height = canvas.height
  const ctx = tunedCanvas.getContext('2d')
  if (!ctx) return
  ctx.filter = cssFilter.value
  ctx.drawImage(canvas, 0, 0)

  const blob = await new Promise((resolve) => tunedCanvas.toBlob(resolve, 'image/jpeg', 0.92))
  const form = new FormData()
  form.append('file', blob, `${image.value.filename}_edited.jpg`)
  const { data } = await api.post(`/images/${imageId.value}/edit`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  ElMessage.success('已保存为新副本')
  router.push(`/images/${data.image.id}`)
}

onMounted(async () => {
  try {
    await load()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加载失败')
  }
})
</script>

<template>
  <AppShell>
    <div v-if="image" class="grid gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <el-button @click="$router.back()">返回</el-button>
        <el-button @click="rotate">旋转 90°</el-button>
        <el-button type="primary" @click="save">保存副本</el-button>
      </div>
      <div class="grid gap-4 md:grid-cols-[1fr_340px]">
        <div class="overflow-hidden rounded-lg border bg-white p-3">
          <div class="overflow-hidden rounded" :style="{ filter: cssFilter }">
            <VueCropper
              ref="cropperRef"
              :src="image.originalUrl"
              :view-mode="1"
              :auto-crop-area="1"
              :background="false"
              :responsive="true"
            />
          </div>
        </div>

        <div class="grid gap-4 rounded-lg border bg-white p-4">
          <div class="text-sm font-medium text-slate-700">裁剪</div>
          <div class="text-xs text-slate-500">拖拽裁剪框；滚轮缩放；拖动图片位置</div>

          <div class="mt-2 text-sm font-medium text-slate-700">色调与调色</div>

          <div class="grid gap-3">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-600">亮度</div>
              <div class="text-xs text-slate-500">{{ Math.round(tune.brightness) }}%</div>
            </div>
            <el-slider v-model="tune.brightness" :min="50" :max="150" :step="1" />

            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-600">对比度</div>
              <div class="text-xs text-slate-500">{{ Math.round(tune.contrast) }}%</div>
            </div>
            <el-slider v-model="tune.contrast" :min="50" :max="150" :step="1" />

            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-600">饱和度</div>
              <div class="text-xs text-slate-500">{{ Math.round(tune.saturation) }}%</div>
            </div>
            <el-slider v-model="tune.saturation" :min="0" :max="200" :step="1" />

            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-600">色相（Hue）</div>
              <div class="text-xs text-slate-500">{{ Math.round(tune.hue) }}°</div>
            </div>
            <el-slider v-model="tune.hue" :min="-180" :max="180" :step="1" />
          </div>

          <div class="flex gap-2 pt-2">
            <el-button @click="resetTune">重置调色</el-button>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
