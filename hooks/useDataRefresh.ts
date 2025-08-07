'use client'

import { createContext, useContext, useCallback, useRef } from 'react'

interface DataRefreshContextType {
  refreshData: (type?: 'practice' | 'songs' | 'folders' | 'all') => void
  registerRefreshHandler: (handler: () => void) => () => void
}

const DataRefreshContext = createContext<DataRefreshContextType | null>(null)

export function useDataRefresh() {
  const context = useContext(DataRefreshContext)
  if (!context) {
    throw new Error('useDataRefresh must be used within a DataRefreshProvider')
  }
  return context
}

// Hook for components that need to refresh data
export function useDataRefreshProvider() {
  const refreshHandlers = useRef<Set<() => void>>(new Set())

  const registerRefreshHandler = useCallback((handler: () => void) => {
    refreshHandlers.current.add(handler)
    return () => {
      refreshHandlers.current.delete(handler)
    }
  }, [])

  const refreshData = useCallback((type?: 'practice' | 'songs' | 'folders' | 'all') => {
    // Debounce multiple refresh calls
    setTimeout(() => {
      refreshHandlers.current.forEach(handler => {
        try {
          handler()
        } catch (error) {
          console.error('Error in refresh handler:', error)
        }
      })
    }, 100)
  }, [])

  return {
    refreshData,
    registerRefreshHandler,
    DataRefreshContext
  }
}
