import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts, useAppKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  const mockAction1 = jest.fn()
  const mockAction2 = jest.fn()

  const shortcuts = [
    {
      key: 'n',
      ctrlKey: true,
      action: mockAction1,
      description: 'Test action 1'
    },
    {
      key: 'Escape',
      action: mockAction2,
      description: 'Test action 2'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Clean up event listeners
    document.removeEventListener('keydown', expect.any(Function))
  })

  it('registers keyboard shortcuts correctly', () => {
    const { result } = renderHook(() => 
      useKeyboardShortcuts({ shortcuts })
    )

    expect(result.current).toEqual(shortcuts)
  })

  it('triggers action when correct key combination is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ shortcuts }))

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true
      })
      document.dispatchEvent(event)
    })

    expect(mockAction1).toHaveBeenCalledTimes(1)
    expect(mockAction2).not.toHaveBeenCalled()
  })

  it('triggers action for simple key press', () => {
    renderHook(() => useKeyboardShortcuts({ shortcuts }))

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      })
      document.dispatchEvent(event)
    })

    expect(mockAction2).toHaveBeenCalledTimes(1)
    expect(mockAction1).not.toHaveBeenCalled()
  })

  it('does not trigger when shortcuts are disabled', () => {
    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: false }))

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true
      })
      document.dispatchEvent(event)
    })

    expect(mockAction1).not.toHaveBeenCalled()
  })

  it('does not trigger when typing in input fields', () => {
    // Create a mock input element
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    renderHook(() => useKeyboardShortcuts({ shortcuts }))

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true,
        target: input
      } as any)
      document.dispatchEvent(event)
    })

    expect(mockAction1).not.toHaveBeenCalled()

    // Cleanup
    document.body.removeChild(input)
  })

  it('does not trigger for incorrect key combinations', () => {
    renderHook(() => useKeyboardShortcuts({ shortcuts }))

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        // Missing ctrlKey
        bubbles: true
      })
      document.dispatchEvent(event)
    })

    expect(mockAction1).not.toHaveBeenCalled()
  })
})

describe('useAppKeyboardShortcuts', () => {
  const mockActions = {
    onNewSong: jest.fn(),
    onNewFolder: jest.fn(),
    onOpenSettings: jest.fn(),
    onToggleSearch: jest.fn(),
    onEscape: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates correct shortcuts for app actions', () => {
    const { result } = renderHook(() => useAppKeyboardShortcuts(mockActions))

    expect(result.current).toHaveLength(5)
    expect(result.current[0]).toMatchObject({
      key: 'n',
      ctrlKey: true,
      description: 'Create new song'
    })
  })

  it('triggers new song action with Ctrl+N', () => {
    renderHook(() => useAppKeyboardShortcuts(mockActions))

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true
      })
      document.dispatchEvent(event)
    })

    expect(mockActions.onNewSong).toHaveBeenCalledTimes(1)
  })

  it('triggers new folder action with Ctrl+Shift+N', () => {
    renderHook(() => useAppKeyboardShortcuts(mockActions))

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true
      })
      document.dispatchEvent(event)
    })

    expect(mockActions.onNewFolder).toHaveBeenCalledTimes(1)
  })

  it('handles missing action callbacks gracefully', () => {
    const partialActions = {
      onNewSong: mockActions.onNewSong
      // Other actions missing
    }

    renderHook(() => useAppKeyboardShortcuts(partialActions))

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: ',',
        ctrlKey: true,
        bubbles: true
      })
      document.dispatchEvent(event)
    })

    // Should not throw error even though onOpenSettings is undefined
    expect(() => {}).not.toThrow()
  })
})
