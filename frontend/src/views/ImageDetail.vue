<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import TagEditor from '../components/TagEditor.vue'
import { api } from '../lib/api'

const route = useRoute()
const router = useRouter()
const image = ref(null)

const imageId = computed(() => Number(route.params.id))

async function load() {
  const { data } = await api.get(`/images/${imageId.value}`)
  image.value = data.image
}

async function del() {
  await ElMessageBox.confirm('确认删除该图片？', '删除确认', { type: 'warning' })
  await api.delete(`/images/${imageId.value}`)
  ElMessage.success('已删除')
  router.push('/gallery')
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
        <el-button @click="$router.push('/gallery')">返回</el-button>
        <el-button type="primary" @click="$router.push(`/images/${image.id}/edit`)">编辑</el-button>
        <el-button type="danger" @click="del">删除</el-button>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="overflow-hidden rounded-lg border bg-white">
          <img class="w-full object-contain" :src="image.thumbnailMediumUrl || image.originalUrl" :alt="image.filename" />
        </div>
        <div class="grid gap-3">
          <div class="rounded-lg border bg-white p-4 text-sm text-slate-700">
            <div class="font-medium">{{ image.filename }}</div>
            <div class="mt-2 grid gap-1">
              <div v-if="image.width && image.height">尺寸：{{ image.width }} x {{ image.height }}</div>
              <div v-if="image.metadata?.captureTime">拍摄时间：{{ image.metadata.captureTime }}</div>
              <div v-if="image.metadata?.locationName">地点：{{ image.metadata.locationName }}</div>
              <div v-if="image.metadata?.cameraModel">相机：{{ image.metadata.cameraModel }}</div>
            </div>
          </div>
          <TagEditor :image-id="image.id" :tags="image.tags" @updated="load" />
        </div>
      </div>
    </div>
  </AppShell>
</template>

