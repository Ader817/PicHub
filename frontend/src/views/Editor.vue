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

async function load() {
  const { data } = await api.get(`/images/${imageId.value}`)
  image.value = data.image
}

function rotate() {
  cropperRef.value?.cropper?.rotate(90)
}

async function save() {
  const canvas = cropperRef.value?.cropper?.getCroppedCanvas()
  if (!canvas) return

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
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
      <div class="overflow-hidden rounded-lg border bg-white p-3">
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
  </AppShell>
</template>

