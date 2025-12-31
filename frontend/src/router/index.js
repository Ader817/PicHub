import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { pinia } from '../pinia'

const routes = [
  { path: '/', redirect: '/gallery' },
  { path: '/login', component: () => import('../views/Login.vue') },
  { path: '/register', component: () => import('../views/Register.vue') },
  { path: '/gallery', meta: { requiresAuth: true }, component: () => import('../views/Gallery.vue') },
  { path: '/images/:id', meta: { requiresAuth: true }, component: () => import('../views/ImageDetail.vue') },
  { path: '/images/:id/edit', meta: { requiresAuth: true }, component: () => import('../views/Editor.vue') },
  { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore(pinia)
  if (to.meta.requiresAuth && !auth.isAuthed) return '/login'
  if ((to.path === '/login' || to.path === '/register') && auth.isAuthed) return '/gallery'
  return true
})

export default router
