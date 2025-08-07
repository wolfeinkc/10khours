import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import Dashboard from '@/components/Dashboard'
import { TestDataCleanup, createMockSong, mockSupabaseResponse } from '../utils/test-utils'

// Integration test for complete practice flow
describe('Practice Flow Integration', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Supabase client with more realistic responses
    mockSupabaseClient = {
      from: jest.fn((table) => {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn(),
          then: jest.fn()
        }

        // Configure responses based on table
        if (table === 'songs') {
          mockChain.then.mockImplementation((callback) => 
            callback(mockSupabaseResponse([createMockSong()]))
          )
          mockChain.single.mockResolvedValue(
            mockSupabaseResponse(createMockSong({ id: 'new-song-id' }))
          )
        } else if (table === 'folders') {
          mockChain.then.mockImplementation((callback) => 
            callback(mockSupabaseResponse([]))
          )
        } else if (table === 'practice_sessions') {
          mockChain.single.mockResolvedValue(
            mockSupabaseResponse({ id: 'new-session-id' })
          )
        }

        return mockChain
      })
    }

    // Mock the Supabase module
    jest.doMock('@/lib/supabase', () => ({
      createClient: () => mockSupabaseClient
    }))
  })

  afterEach(async () => {
    // Clean up any test data
    await TestDataCleanup.cleanup()
  })

  it('completes full practice session workflow', async () => {
    render(<Dashboard />)

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Practice Tracker')).toBeInTheDocument()
    })

    // Step 1: Create a new song
    fireEvent.click(screen.getByText('Add Song'))
    
    await waitFor(() => {
      expect(screen.getByText('Add New Song')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Song Title'), {
      target: { value: 'Integration Test Song' }
    })
    fireEvent.change(screen.getByLabelText('Artist (Optional)'), {
      target: { value: 'Test Artist' }
    })
    fireEvent.click(screen.getByText('Add Song'))

    // Step 2: Start practice session
    await waitFor(() => {
      expect(screen.getByText('Practice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Practice'))

    // Verify practice timer appears
    await waitFor(() => {
      expect(screen.getByText('Integration Test Song')).toBeInTheDocument()
      expect(screen.getByText('0:00')).toBeInTheDocument()
    })

    // Step 3: Start timer
    const playButton = screen.getByRole('button', { name: /play/i })
    fireEvent.click(playButton)

    // Verify timer is running
    await waitFor(() => {
      expect(screen.getByText('Recording')).toBeInTheDocument()
    })

    // Step 4: Stop practice session
    const stopButton = screen.getByRole('button', { name: /stop/i })
    fireEvent.click(stopButton)

    // Verify session is saved and timer is closed
    await waitFor(() => {
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('practice_sessions')
    })
  })

  it('handles errors gracefully during practice flow', async () => {
    // Mock error response
    mockSupabaseClient.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      then: jest.fn((callback) => callback(mockSupabaseResponse([], new Error('Network error'))))
    }))

    render(<Dashboard />)

    // Should show error boundary or error message
    await waitFor(() => {
      expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument()
    })
  })

  it('maintains data consistency across operations', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Practice Tracker')).toBeInTheDocument()
    })

    // Create song
    fireEvent.click(screen.getByText('Add Song'))
    fireEvent.change(screen.getByLabelText('Song Title'), {
      target: { value: 'Consistency Test Song' }
    })
    fireEvent.click(screen.getByText('Add Song'))

    // Verify song appears in library
    await waitFor(() => {
      expect(screen.getByText('Consistency Test Song')).toBeInTheDocument()
    })

    // Switch to Analytics tab
    fireEvent.click(screen.getByText('Analytics'))

    // Switch back to Library tab
    fireEvent.click(screen.getByText('Library'))

    // Verify song is still there
    expect(screen.getByText('Consistency Test Song')).toBeInTheDocument()
  })

  it('handles concurrent operations correctly', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Practice Tracker')).toBeInTheDocument()
    })

    // Simulate multiple quick operations
    fireEvent.click(screen.getByText('Add Song'))
    fireEvent.click(screen.getByText('Add Folder'))

    // Both dialogs should be manageable
    await waitFor(() => {
      expect(screen.getByText('Add New Song') || screen.getByText('Create New Folder')).toBeInTheDocument()
    })
  })

  it('preserves user settings across sessions', async () => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(() => JSON.stringify({
        theme: 'dark',
        defaultMetronomeBPM: 140,
        notifications: false
      })),
      setItem: jest.fn(),
      removeItem: jest.fn()
    }
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Settings'))

    // Verify settings are loaded from localStorage
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('practiceAppSettings')
  })
})
