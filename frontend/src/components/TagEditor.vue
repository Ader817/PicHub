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
  try {
    await api.post(`/images/${props.imageId}/ai-tags`)
    ElMessage.success('AI 标签已生成')
    emit('updated')
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || 'AI 标签生成失败（可能未配置 GEMINI_API_KEY）')
  }
}
</script>

<template>
  <div class="grid gap-3 rounded-lg border bg-white p-4">
    <div class="flex flex-wrap gap-2">
      <el-tag v-for="t in tags" :key="t.id" :type="t.type === 'ai' ? 'success' : 'info'" closable @close="removeTag(t.id)">
        {{ t.name }}
      </el-tag>
      <div v-if="tags.length === 0" class="text-sm text-slate-500">暂无标签</div>
    </div>
    <div class="flex flex-wrap gap-2">
      <el-input v-model="newTag" placeholder="添加标签" class="w-56" @keyup.enter="addTag" />
      <el-button @click="addTag">添加</el-button>
      <el-button type="success" @click="aiTags">生成 AI 标签</el-button>
    </div>
  </div>
</template>

