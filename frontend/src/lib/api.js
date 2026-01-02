import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { pinia } from '../pinia'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

// Flag to prevent multiple redirects
let isRedirecting = false

api.interceptors.request.use((config) => {
  const auth = useAuthStore(pinia)
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true
      const auth = useAuthStore(pinia)

      // Clear authentication
      auth.logout()

      // Show user-friendly message
      console.warn('Authentication expired. Please log in again.')

      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }

      // Reset flag after a short delay
      setTimeout(() => {
        isRedirecting = false
      }, 1000)
    }

    // Return the error for further handling
    return Promise.reject(error)
  }
)
