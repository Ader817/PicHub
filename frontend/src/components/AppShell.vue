<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const title = computed(() => {
  if (route.path.startsWith('/gallery')) return 'PicHub'
  if (route.path.endsWith('/edit')) return '编辑图片'
  if (route.path.startsWith('/images/')) return '图片详情'
  if (route.path === '/login') return '登录'
  if (route.path === '/register') return '注册'
  return 'PicHub'
})

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen">
    <div class="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div class="font-semibold">{{ title }}</div>
        <div class="flex items-center gap-3">
          <div v-if="auth.user" class="text-sm text-slate-600">{{ auth.user.username }}</div>
          <el-button v-if="auth.isAuthed" size="small" @click="logout">退出</el-button>
        </div>
      </div>
    </div>
    <div class="mx-auto max-w-6xl px-4 py-6">
      <slot />
    </div>
  </div>
</template>

