<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppShell from '../components/AppShell.vue'
import ImageCarousel from '../components/ImageCarousel.vue'
import ImageUploader from '../components/ImageUploader.vue'
import ImageGrid from '../components/ImageGrid.vue'
import SearchPanel from '../components/SearchPanel.vue'
import { api } from '../lib/api'

const images = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/images', { params: { limit: 50 } })
    images.value = data.images || []
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function setResults(list) {
  images.value = list
}

onMounted(load)
</script>

<template>
  <AppShell>
    <div class="grid gap-6">
      <ImageUploader @uploaded="load" />
      <ImageCarousel :images="images" />
      <SearchPanel @results="setResults" />
      <el-skeleton :loading="loading" animated>
        <ImageGrid :images="images" />
      </el-skeleton>
    </div>
  </AppShell>
</template>
