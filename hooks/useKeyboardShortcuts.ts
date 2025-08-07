'use client'

import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  preventDefault?: boolean
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs or when any text input has focus
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }
    
    // Additional check for focused elements that might be text inputs
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
      return
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.metaKey === event.metaKey
      )
    })

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault()
      }
      matchingShortcut.action()
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])

  return shortcuts
}

// Common keyboard shortcuts for the app
export const useAppKeyboardShortcuts = (actions: {
  onNewSong?: () => void
  onNewFolder?: () => void
  onOpenSettings?: () => void
  onToggleSearch?: () => void
  onEscape?: () => void
}) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      ctrlKey: true,
      action: () => actions.onNewSong?.(),
      description: 'Create new song'
    },
    {
      key: 'n',
      ctrlKey: true,
      shiftKey: true,
      action: () => actions.onNewFolder?.(),
      description: 'Create new folder'
    },
    {
      key: ',',
      ctrlKey: true,
      action: () => actions.onOpenSettings?.(),
      description: 'Open settings'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => actions.onToggleSearch?.(),
      description: 'Toggle search'
    },
    {
      key: 'Escape',
      action: () => actions.onEscape?.(),
      description: 'Close modal/cancel action',
      preventDefault: false
    }
  ]

  return useKeyboardShortcuts({ shortcuts })
}

// Practice timer specific shortcuts
export const usePracticeTimerShortcuts = (actions: {
  onPlayPause?: () => void
  onStop?: () => void
  onToggleMetronome?: () => void
  onToggleFullscreen?: () => void
}) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: ' ',
      action: () => actions.onPlayPause?.(),
      description: 'Play/Pause timer'
    },
    {
      key: 's',
      action: () => actions.onStop?.(),
      description: 'Stop timer'
    },
    {
      key: 'm',
      action: () => actions.onToggleMetronome?.(),
      description: 'Toggle metronome'
    },
    {
      key: 'f',
      action: () => actions.onToggleFullscreen?.(),
      description: 'Toggle fullscreen'
    }
  ]

  return useKeyboardShortcuts({ shortcuts })
}

// Hook to display keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const getShortcutDisplay = (shortcut: KeyboardShortcut) => {
    const keys = []
    
    if (shortcut.ctrlKey || shortcut.metaKey) {
      keys.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    }
    if (shortcut.altKey) {
      keys.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt')
    }
    if (shortcut.shiftKey) {
      keys.push('⇧')
    }
    
    keys.push(shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase())
    
    return keys.join(' + ')
  }

  return { getShortcutDisplay }
}
