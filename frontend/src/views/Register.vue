<script setup>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ username: '', email: '', password: '' })

async function submit() {
  try {
    const { data } = await api.post('/auth/register', form)
    auth.setAuth({ token: data.token, user: data.user })
    router.push('/gallery')
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '注册失败')
  }
}
</script>

<template>
  <AppShell>
    <div class="mx-auto grid max-w-md gap-4 rounded-xl border bg-white p-6">
      <div class="text-lg font-semibold">注册</div>
      <el-input v-model="form.username" placeholder="用户名（≥6）" />
      <el-input v-model="form.email" placeholder="邮箱" />
      <el-input v-model="form.password" type="password" show-password placeholder="密码（≥6）" />
      <el-button type="primary" @click="submit">注册</el-button>
      <div class="text-sm text-slate-600">
        已有账号？
        <router-link class="text-blue-600" to="/login">登录</router-link>
      </div>
    </div>
  </AppShell>
</template>

