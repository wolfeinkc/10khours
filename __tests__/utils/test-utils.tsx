import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import AuthProvider from '@/components/AuthProvider'

// Mock user for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
}

// Mock auth context
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="mock-auth-provider">
      {children}
    </div>
  )
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockAuthProvider>
      {children}
    </MockAuthProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test data generators
export const createMockSong = (overrides = {}) => ({
  id: 'test-song-id',
  user_id: 'test-user-id',
  title: 'Test Song',
  artist: 'Test Artist',
  color: '#3B82F6',
  notes: null,
  metronome_bpm: 120,
  folder_id: null,
  position: 0,
  created_at: '2023-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockFolder = (overrides = {}) => ({
  id: 'test-folder-id',
  user_id: 'test-user-id',
  name: 'Test Folder',
  color: '#8B5CF6',
  position: 0,
  created_at: '2023-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockPracticeSession = (overrides = {}) => ({
  id: 'test-session-id',
  user_id: 'test-user-id',
  song_id: 'test-song-id',
  duration_minutes: 30,
  notes: 'Great practice session',
  created_at: '2023-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockGoal = (overrides = {}) => ({
  id: 'test-goal-id',
  user_id: 'test-user-id',
  title: 'Practice 30 minutes daily',
  description: 'Daily practice goal',
  goal_type: 'daily_minutes',
  target_value: 30,
  current_progress: 15,
  deadline: '2023-12-31T23:59:59.000Z',
  is_completed: false,
  created_at: '2023-01-01T00:00:00.000Z',
  ...overrides,
})

// Cleanup utilities for integration tests
export class TestDataCleanup {
  private static testUserIds: Set<string> = new Set()
  private static testDataIds: Map<string, Set<string>> = new Map()

  static addTestUser(userId: string) {
    this.testUserIds.add(userId)
  }

  static addTestData(table: string, id: string) {
    if (!this.testDataIds.has(table)) {
      this.testDataIds.set(table, new Set())
    }
    this.testDataIds.get(table)!.add(id)
  }

  static async cleanup() {
    // In a real implementation, this would connect to Supabase and clean up test data
    // For now, we'll just clear our tracking
    console.log('Cleaning up test data...')
    console.log('Test users to cleanup:', Array.from(this.testUserIds))
    console.log('Test data to cleanup:', Object.fromEntries(this.testDataIds))
    
    // Clear tracking
    this.testUserIds.clear()
    this.testDataIds.clear()
  }
}

// Mock Supabase responses
export const mockSupabaseResponse = (data: any, error: any = null) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
})

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const pass = typeof received === 'string' && uuidRegex.test(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      }
    }
  },
})
