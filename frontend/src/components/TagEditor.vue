<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../lib/api'

const props = defineProps({
  imageId: { type: Number, required: true },
  tags: { type: Array, required: true },
})
const emit = defineEmits(['updated'])

const newTag = ref('')
const aiLoading = ref(false)

async function addTag() {
  const name = newTag.value.trim()
  if (!name) return
  await api.post(`/images/${props.imageId}/tags`, { name })
  newTag.value = ''
  emit('updated')
}

async function removeTag(tagId) {
  await api.delete(`/images/${props.imageId}/tags/${tagId}`)
  emit('updated')
}

async function aiTags() {
  if (aiLoading.value) return
  aiLoading.value = true
  try {
    await api.post(`/images/${props.imageId}/ai-tags`)
    ElMessage.success('AI 标签已生成')
    emit('updated')
  } catch (e) {
    const status = e?.response?.status
    const msg = e?.response?.data?.message
    if (status === 501) ElMessage.error(msg || 'GEMINI_API_KEY 未配置')
    else ElMessage.error(msg || 'AI 标签生成失败（网络/超时）')
  } finally {
    aiLoading.value = false
  }
}
</script>

<template>
  <div class="grid gap-3 p-4 pg-card">
    <div class="flex items-center justify-between gap-2">
      <div class="pg-kicker text-base">标签</div>
      <div class="text-xs" :style="{ color: 'var(--pg-muted-foreground)' }">自定义标签与 AI 标签</div>
    </div>
    <div class="flex flex-wrap gap-2">
      <el-tag
        v-for="t in tags"
        :key="t.id"
        :type="t.type === 'ai' ? 'success' : t.type === 'auto' ? 'warning' : 'info'"
        closable
        @close="removeTag(t.id)"
      >
        {{ t.name }}
      </el-tag>
      <div v-if="tags.length === 0" class="text-sm" :style="{ color: 'var(--pg-muted-foreground)' }">暂无标签</div>
    </div>
    <div class="flex flex-nowrap items-center gap-2 overflow-x-auto">
      <el-input
        v-model="newTag"
        placeholder="添加标签"
        class="pg-input-pill w-56 shrink-0"
        :disabled="aiLoading"
        @keyup.enter="addTag"
      />
      <el-button class="shrink-0 whitespace-nowrap" @click="addTag">添加</el-button>
      <el-button class="shrink-0 whitespace-nowrap" type="success" :loading="aiLoading" @click="aiTags">生成 AI 标签</el-button>
    </div>
    <div v-if="aiLoading" class="flex items-center gap-2 text-xs" :style="{ color: 'var(--pg-muted-foreground)' }">
      <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span>正在生成 AI 标签…（网络慢时可能需要等待）</span>
    </div>
  </div>
</template>
