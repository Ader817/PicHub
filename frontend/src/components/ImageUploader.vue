<script setup>
import { ElMessage } from 'element-plus'
import { api } from '../lib/api'

const emit = defineEmits(['uploaded'])

async function uploadRequest(options) {
  const form = new FormData()
  form.append('files', options.file)
  try {
    await api.post('/images/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (options.onProgress && e.total) options.onProgress({ percent: (e.loaded / e.total) * 100 })
      },
    })
    options.onSuccess?.()
    ElMessage.success('上传成功')
    emit('uploaded')
  } catch (e) {
    options.onError?.(e)
    ElMessage.error(e?.response?.data?.message || '上传失败')
  }
}
</script>

<template>
  <el-upload
    multiple
    drag
    :limit="20"
    accept="image/jpeg,image/png,image/gif,image/webp"
    :http-request="uploadRequest"
    :show-file-list="false"
  >
    <div class="py-6 text-slate-600">拖拽图片到此处或点击上传（最多 20 张，每张 ≤ 10MB）</div>
  </el-upload>
</template>

