<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../lib/api'

const emit = defineEmits(['results'])

const criteria = reactive({
  location: '',
  filename: '',
  minWidth: undefined,
  minHeight: undefined,
  tagsText: '',
})

const nlQuery = ref('')

async function doSearch() {
  const tags = criteria.tagsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const payload = {
    location: criteria.location || undefined,
    filename: criteria.filename || undefined,
    minWidth: criteria.minWidth || undefined,
    minHeight: criteria.minHeight || undefined,
    tags: tags.length ? tags : undefined,
  }
  const { data } = await api.post('/images/search', payload)
  emit('results', data.images || [])
}

async function doNlSearch() {
  if (!nlQuery.value.trim()) return
  try {
    const { data } = await api.post('/images/nl-search', { query: nlQuery.value })
    emit('results', data.images || [])
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '自然语言搜索失败（可能未配置 GEMINI_API_KEY）')
  }
}
</script>

<template>
  <div class="grid gap-3 p-4 pg-card">
    <div class="flex flex-wrap items-center gap-2">
      <div class="pg-kicker text-base">搜索</div>
      <div class="text-xs" :style="{ color: 'var(--pg-muted-foreground)' }">支持条件搜索与自然语言搜索</div>
    </div>
    <div class="grid grid-cols-1 gap-3 md:grid-cols-5">
      <el-input v-model="criteria.location" placeholder="地点（模糊匹配）" />
      <el-input v-model="criteria.filename" placeholder="文件名（模糊）" />
      <el-input v-model.number="criteria.minWidth" placeholder="最小宽度" />
      <el-input v-model.number="criteria.minHeight" placeholder="最小高度" />
      <el-input v-model="criteria.tagsText" placeholder="标签（逗号分隔）" />
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <el-button type="primary" @click="doSearch">搜索</el-button>
      <div class="ml-auto flex w-full gap-2 md:w-auto">
        <el-input v-model="nlQuery" placeholder="自然语言搜索（如：上个月在北京拍的风景照）" />
        <el-button @click="doNlSearch">NL 搜索</el-button>
      </div>
    </div>
  </div>
</template>
