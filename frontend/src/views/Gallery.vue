<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppShell from '../components/AppShell.vue'
import ImageCarousel from '../components/ImageCarousel.vue'
import ImageUploader from '../components/ImageUploader.vue'
import ImageGrid from '../components/ImageGrid.vue'
import SearchPanel from '../components/SearchPanel.vue'
import { api } from '../lib/api'

const images = ref([])
const loading = ref(false)
const activeFilters = ref(null)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/images', { params: { limit: 50 } })
    images.value = data.images || []
    activeFilters.value = null
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function setResults(list) {
  images.value = list
}

function setFilters(info) {
  activeFilters.value = info || null
}

const filterChips = computed(() => {
  const f = activeFilters.value
  if (!f) return []

  const chips = []

  if (f.mode === 'nl') {
    if (f.query) chips.push({ label: 'NL', value: f.query })
    if (!f.criteria) chips.push({ label: '解析', value: f.error ? `失败：${String(f.error).slice(0, 80)}` : '失败（可尝试条件搜索）' })
  }

  const c = f.criteria || {}
  if (c.location) chips.push({ label: '地点', value: c.location })
  if (c.filename) chips.push({ label: '文件名', value: c.filename })
  if (c.minWidth) chips.push({ label: '最小宽度', value: String(c.minWidth) })
  if (c.minHeight) chips.push({ label: '最小高度', value: String(c.minHeight) })
  if (Array.isArray(c.tags) && c.tags.length) chips.push({ label: '标签', value: c.tags.join(', ') })
  if (c.timeRange?.start || c.timeRange?.end) {
    chips.push({ label: '拍摄时间', value: `${c.timeRange?.start || '…'} ~ ${c.timeRange?.end || '…'}` })
  }
  if (c.uploadTimeRange?.start || c.uploadTimeRange?.end) {
    chips.push({ label: '上传时间', value: `${c.uploadTimeRange?.start || '…'} ~ ${c.uploadTimeRange?.end || '…'}` })
  }

  return chips
})

const emptyDescription = computed(() => {
  if (loading.value) return ''
  if (activeFilters.value) return '没有找到匹配的图片'
  return '暂无图片，先上传几张吧'
})

onMounted(load)
</script>

<template>
  <AppShell>
    <div class="grid gap-6">
      <ImageUploader @uploaded="load" />
      <ImageCarousel :images="images" />
      <SearchPanel @results="setResults" @filters="setFilters" />

      <div v-if="activeFilters" class="pg-card p-4">
        <div class="flex flex-wrap items-center gap-2">
          <div class="pg-kicker text-base">当前筛选条件</div>
          <div class="ml-auto">
            <el-button size="small" @click="load">清除筛选</el-button>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <el-tag v-for="c in filterChips" :key="`${c.label}:${c.value}`" type="info">{{ c.label }}：{{ c.value }}</el-tag>
        </div>
      </div>

      <el-skeleton :loading="loading" animated>
        <template #default>
          <ImageGrid v-if="images.length" :images="images" />
          <div v-else class="pg-card p-8">
            <el-empty :description="emptyDescription">
              <div v-if="activeFilters && filterChips.length" class="mt-2 flex flex-wrap justify-center gap-2">
                <el-tag v-for="c in filterChips" :key="`empty:${c.label}:${c.value}`" type="info">{{ c.label }}：{{ c.value }}</el-tag>
              </div>
            </el-empty>
          </div>
        </template>
      </el-skeleton>
    </div>
  </AppShell>
</template>
