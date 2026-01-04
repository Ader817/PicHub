<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../lib/api'

const emit = defineEmits(['results', 'filters'])

const criteriaLoading = ref(false)
const nlLoading = ref(false)

const criteria = reactive({
  location: '',
  filename: '',
  minWidth: undefined,
  minHeight: undefined,
  tagsText: '',
})

const nlQuery = ref('')

async function doSearch() {
  if (criteriaLoading.value || nlLoading.value) return
  criteriaLoading.value = true
  try {
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
    emit('filters', { mode: 'criteria', criteria: data?.criteria || payload })
    emit('results', data.images || [])
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '搜索失败')
  } finally {
    criteriaLoading.value = false
  }
}

async function doNlSearch() {
  if (!nlQuery.value.trim()) return
  if (criteriaLoading.value || nlLoading.value) return
  nlLoading.value = true
  try {
    const { data } = await api.post('/images/nl-search', { query: nlQuery.value })
    if (data?.error) {
      const msg = String(data.error)
      const level = data?.errorLevel === 'warning' ? 'warning' : 'error'
      ElMessage({
        type: level,
        message: msg.length > 400 ? `${msg.slice(0, 400)}…` : msg,
        showClose: true,
        duration: 8000,
      })
    }
    emit('filters', { mode: 'nl', query: data?.query || nlQuery.value, criteria: data?.criteria || null, error: data?.error || null })
    emit('results', data.images || [])
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '自然语言搜索失败（可能未配置 GEMINI_API_KEY）')
  } finally {
    nlLoading.value = false
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
      <el-input v-model="criteria.location" placeholder="地点" />
      <el-input v-model="criteria.filename" placeholder="文件名" />
      <el-input v-model.number="criteria.minWidth" placeholder="最小宽度" />
      <el-input v-model.number="criteria.minHeight" placeholder="最小高度" />
      <el-input v-model="criteria.tagsText" placeholder="标签（逗号分隔）" />
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <el-button type="primary" :loading="criteriaLoading" :disabled="nlLoading" @click="doSearch">搜索</el-button>
      <div class="ml-auto flex w-full flex-1 gap-2 md:w-auto">
        <el-input v-model="nlQuery" class="min-w-0 flex-1" placeholder="（例如：我想找风景照 / 2025 年拍的照片）" />
        <el-button :loading="nlLoading" :disabled="criteriaLoading || !nlQuery.trim()" @click="doNlSearch">自然语言搜索</el-button>
      </div>
    </div>
    <div v-if="criteriaLoading || nlLoading" class="flex items-center gap-2 text-xs" :style="{ color: 'var(--pg-muted-foreground)' }">
      <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span v-if="criteriaLoading">正在搜索…</span>
      <span v-else>正在调用 Gemini 解析并检索…（网络慢时可能需要等待）</span>
    </div>
  </div>
</template>
