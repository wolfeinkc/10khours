import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import Dashboard from '@/components/Dashboard'
import { createMockSong, createMockFolder, mockSupabaseResponse } from '../utils/test-utils'

// Mock the Dashboard's dependencies
jest.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    signOut: jest.fn(),
  }),
}))

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn((callback) => {
        if (table === 'songs') {
          return callback(mockSupabaseResponse([createMockSong()]))
        }
        if (table === 'folders') {
          return callback(mockSupabaseResponse([createMockFolder()]))
        }
        return callback(mockSupabaseResponse([]))
      }),
    })),
  }),
}))

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders dashboard with loading state initially', () => {
    render(<Dashboard />)
    expect(screen.getByText('Loading your practice data...')).toBeInTheDocument()
  })

  it('renders dashboard with songs and folders after loading', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Practice Tracker')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Goals')).toBeInTheDocument()
  })

  it('opens create song dialog when Add Song button is clicked', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Song')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Add Song'))
    expect(screen.getByText('Add New Song')).toBeInTheDocument()
  })

  it('opens create folder dialog when Add Folder button is clicked', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Folder')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Add Folder'))
    expect(screen.getByText('Create New Folder')).toBeInTheDocument()
  })

  it('opens settings modal when Settings button is clicked', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Settings'))
    expect(screen.getByText('Customize your practice tracking experience')).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Analytics'))
    expect(screen.getByText('Practice Statistics')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Goals'))
    expect(screen.getByText('Practice Goals')).toBeInTheDocument()
  })

  it('toggles between standard and organize view modes', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Standard')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Organize'))
    expect(screen.getByText('Done Organizing')).toBeInTheDocument()
  })

  it('handles keyboard shortcuts correctly', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Practice Tracker')).toBeInTheDocument()
    })
    
    // Test Ctrl+N for new song
    fireEvent.keyDown(document, { key: 'n', ctrlKey: true })
    expect(screen.getByText('Add New Song')).toBeInTheDocument()
    
    // Close dialog
    fireEvent.keyDown(document, { key: 'Escape' })
    
    // Test Ctrl+Shift+N for new folder
    fireEvent.keyDown(document, { key: 'n', ctrlKey: true, shiftKey: true })
    expect(screen.getByText('Create New Folder')).toBeInTheDocument()
  })
})
