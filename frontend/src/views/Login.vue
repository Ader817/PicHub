<script setup>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ identifier: '', password: '' })

async function submit() {
  try {
    const { data } = await api.post('/auth/login', form)
    auth.setAuth({ token: data.token, user: data.user })
    router.push('/gallery')
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '登录失败')
  }
}
</script>

<template>
  <AppShell>
    <div class="mx-auto grid max-w-md gap-4 rounded-xl border bg-white p-6">
      <div class="text-lg font-semibold">登录</div>
      <el-input v-model="form.identifier" placeholder="用户名或邮箱" />
      <el-input v-model="form.password" type="password" show-password placeholder="密码" />
      <el-button type="primary" @click="submit">登录</el-button>
      <div class="text-sm text-slate-600">
        还没有账号？
        <router-link class="text-blue-600" to="/register">注册</router-link>
      </div>
    </div>
  </AppShell>
</template>

