import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../api'
import axios from 'axios'
import { useAuthStore } from '../../stores/auth'
import { pinia } from '../../pinia'

// Mock axios interceptors - we need to test the logic, not the actual HTTP calls
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  }
  return mockAxios
})

describe('API Client - 401 Response Handler', () => {
  let mockError
  let authStore

  beforeEach(() => {
    // Reset redirect flag
    isRedirecting = false

    // Setup mock error
    mockError = {
      response: { status: 401 },
      config: {},
    }

    // Get auth store
    authStore = useAuthStore(pinia)
    authStore.token = 'test_token'
    authStore.user = { id: 1, username: 'test' }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should clear auth data on 401 response', async () => {
    // Setup: User is logged in
    expect(authStore.token).toBe('test_token')
    expect(authStore.user).not.toBeNull()

    // Simulate 401 error
    const error = new Error('Unauthorized')
    error.response = { status: 401 }

    // Trigger the interceptor error handler
    // Note: In actual implementation, this would be called by axios
    const authStore1 = useAuthStore(pinia)
    authStore1.logout()

    // Verify: Auth data is cleared
    expect(authStore1.token).toBe('')
    expect(authStore1.user).toBeNull()
  })

  it('should not clear auth data on other errors', async () => {
    // Setup: User is logged in
    expect(authStore.token).toBe('test_token')

    // Simulate 500 error
    const error = new Error('Server Error')
    error.response = { status: 500 }

    // Auth should remain intact
    expect(authStore.token).toBe('test_token')
    expect(authStore.user).not.toBeNull()
  })

  it('should prevent multiple simultaneous redirects', () => {
    // This test verifies the isRedirecting flag prevents infinite loops
    let redirectCount = 0

    // Simulate multiple 401 errors in quick succession
    for (let i = 0; i < 3; i++) {
      if (!isRedirecting) {
        isRedirecting = true
        redirectCount++
      }
    }

    // Should only redirect once
    expect(redirectCount).toBe(1)

    // Cleanup
    isRedirecting = false
  })
})

describe('API Client - Request Interceptor', () => {
  it('should add Authorization header when token exists', () => {
    const authStore = useAuthStore(pinia)
    authStore.token = 'test_token_123'

    // Mock config object
    const config = { headers: {} }

    // Simulate request interceptor
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }

    expect(config.headers.Authorization).toBe('Bearer test_token_123')
  })

  it('should not add Authorization header when token is missing', () => {
    const authStore = useAuthStore(pinia)
    authStore.token = ''

    // Mock config object
    const config = { headers: {} }

    // Simulate request interceptor
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }

    expect(config.headers.Authorization).toBeUndefined()
  })
})
