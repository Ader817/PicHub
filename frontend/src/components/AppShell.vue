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
    <div
      class="sticky top-0 z-10 border-b-2 backdrop-blur"
      :style="{ borderColor: 'var(--pg-foreground)', backgroundColor: 'rgba(255,253,245,0.85)' }"
    >
      <div class="relative mx-auto max-w-6xl px-4 py-4">
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            class="pg-shape absolute -left-10 -top-10 h-24 w-24 rounded-full opacity-80"
            style="--pg-shape-color: var(--pg-tertiary)"
          />
          <div
            class="pg-shape absolute -right-12 -top-6 h-16 w-16 rounded-2xl opacity-70 rotate-12"
            style="--pg-shape-color: var(--pg-secondary)"
          />
        </div>

        <div class="relative flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="pg-kicker text-lg">{{ title }}</div>
          </div>
          <div class="flex items-center gap-3">
            <div v-if="auth.user" class="hidden text-sm md:block" :style="{ color: 'var(--pg-muted-foreground)' }">
              {{ auth.user.username }}
            </div>
            <el-button v-if="auth.isAuthed" size="small" @click="logout">退出</el-button>
          </div>
        </div>
      </div>
    </div>
    <div class="mx-auto max-w-6xl px-4 py-8">
      <slot />
    </div>
  </div>
</template>
