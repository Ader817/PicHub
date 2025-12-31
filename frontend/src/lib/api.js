import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { pinia } from '../pinia'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

api.interceptors.request.use((config) => {
  const auth = useAuthStore(pinia)
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
  return config
})
