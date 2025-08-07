import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import CreateSongDialog from '@/components/CreateSongDialog'
import { createMockFolder, mockSupabaseResponse } from '../utils/test-utils'

const mockOnClose = jest.fn()
const mockOnSongCreated = jest.fn()
const mockFolders = [createMockFolder({ name: 'Test Folder' })]

// Mock Supabase
const mockInsert = jest.fn()
const mockSelect = jest.fn()
const mockSingle = jest.fn()

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: mockInsert.mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: mockSingle,
    })),
  }),
}))

jest.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
  }),
}))

describe('CreateSongDialog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSingle.mockResolvedValue(mockSupabaseResponse({ id: 'new-song-id' }))
  })

  it('renders create song dialog when open', () => {
    render(
      <CreateSongDialog
        isOpen={true}
        onClose={mockOnClose}
        onSongCreated={mockOnSongCreated}
        folders={mockFolders}
      />
    )

    expect(screen.getByText('Add New Song')).toBeInTheDocument()
    expect(screen.getByLabelText('Song Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Artist (Optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Folder (Optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Metronome BPM')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <CreateSongDialog
        isOpen={false}
        onClose={mockOnClose}
        onSongCreated={mockOnSongCreated}
        folders={mockFolders}
      />
    )

    expect(screen.queryByText('Add New Song')).not.toBeInTheDocument()
  })

  it('handles form submission correctly', async () => {
    render(
      <CreateSongDialog
        isOpen={true}
        onClose={mockOnClose}
        onSongCreated={mockOnSongCreated}
        folders={mockFolders}
      />
    )

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Song Title'), {
      target: { value: 'Test Song' }
    })
    fireEvent.change(screen.getByLabelText('Artist (Optional)'), {
      target: { value: 'Test Artist' }
    })
    fireEvent.change(screen.getByLabelText('Metronome BPM'), {
      target: { value: '140' }
    })

    // Submit the form
    fireEvent.click(screen.getByText('Add Song'))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Song',
          artist: 'Test Artist',
          metronome_bpm: 140,
        })
      )
    })
  })

  it('handles folder selection correctly', async () => {
    render(
      <CreateSongDialog
        isOpen={true}
        onClose={mockOnClose}
        onSongCreated={mockOnSongCreated}
        folders={mockFolders}
      />
    )

    // Test folder selection
    const folderSelect = screen.getByRole('combobox')
    fireEvent.click(folderSelect)
    
    await waitFor(() => {
      expect(screen.getByText('Test Folder')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Test Folder'))
    
    // Fill in required fields and submit
    fireEvent.change(screen.getByLabelText('Song Title'), {
      target: { value: 'Test Song' }
    })
    fireEvent.click(screen.getByText('Add Song'))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          folder_id: mockFolders[0].id,
        })
      )
    })
  })

  it('handles "No folder" selection correctly', async () => {
    render(
      <CreateSongDialog
        isOpen={true}
        onClose={mockOnClose}
        onSongCreated={mockOnSongCreated}
        folders={mockFolders}
      />
    )

    // Test "No folder" selection
    const folderSelect = screen.getByRole('combobox')
    fireEvent.click(folderSelect)
    
    await waitFor(() => {
      expect(screen.getByText('No folder')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('No folder'))
    
    // Fill in required fields and submit
    fireEvent.change(screen.getByLabelText('Song Title'), {
      target: { value: 'Test Song' }
    })
    fireEvent.click(screen.getByText('Add Song'))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          folder_id: null,
        })
      )
    })
  })

  it('validates required fields', async () => {
    render(
      <CreateSongDialog
        isOpen={true}
        onClose={mockOnClose}
        onSongCreated={mockOnSongCreated}
        folders={mockFolders}
      />
    )

    // Try to submit without title
    fireEvent.click(screen.getByText('Add Song'))

    // Should not call insert without title
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('handles submission errors gracefully', async () => {
    mockSingle.mockRejectedValue(new Error('Database error'))

    render(
      <CreateSongDialog
        isOpen={true}
        onClose={mockOnClose}
        onSongCreated={mockOnSongCreated}
        folders={mockFolders}
      />
    )

    fireEvent.change(screen.getByLabelText('Song Title'), {
      target: { value: 'Test Song' }
    })
    fireEvent.click(screen.getByText('Add Song'))

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument()
    })
  })

  it('closes dialog when cancel is clicked', () => {
    render(
      <CreateSongDialog
        isOpen={true}
        onClose={mockOnClose}
        onSongCreated={mockOnSongCreated}
        folders={mockFolders}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })
})
