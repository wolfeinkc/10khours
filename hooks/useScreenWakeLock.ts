'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// Import NoSleep.js for mobile wake lock support
import NoSleep from 'nosleep.js'

// Type definitions for Wake Lock API
interface WakeLockSentinel {
  released: boolean
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
  removeEventListener(type: 'release', listener: () => void): void
}

// Explicitly declare wake lock method on Navigator to avoid conflicts with lib.dom.d.ts
interface WakeLockAPI {
  request(type: 'screen'): Promise<WakeLockSentinel>
}

/**
 * Custom hook to keep the screen awake during practice sessions
 * Uses multiple fallback methods for maximum mobile compatibility
 */
export default function useScreenWakeLock() {
  const [isWakeLockActive, setIsWakeLockActive] = useState(false)
  const [isWakeLockSupported, setIsWakeLockSupported] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const noSleepRef = useRef<NoSleep | null>(null)
  const hasInitializedRef = useRef<boolean>(false)
  
  // Lazily initialize NoSleep.js only once when needed
  const initNoSleep = useCallback(() => {
    if (!noSleepRef.current && typeof window !== 'undefined') {
      try {
        noSleepRef.current = new NoSleep()
        console.log('NoSleep.js initialized')
        return true
      } catch (err) {
        console.error('Failed to initialize NoSleep.js:', err)
        return false
      }
    }
    return !!noSleepRef.current
  }, [])

  // Check for wake lock support
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasInitializedRef.current) {
      const hasNativeWakeLock = 'wakeLock' in navigator
      
      // We consider wake lock supported if either API is available
      const isSupported = hasNativeWakeLock || initNoSleep()
      setIsWakeLockSupported(isSupported)
      hasInitializedRef.current = true
      
      console.log('Wake lock support detected:', isSupported ? 'YES' : 'NO')
    }
  }, [initNoSleep])

  /**
   * Enable wake lock using all available methods
   * Prioritizes NoSleep.js for mobile, then tries native API
   * Must be called in response to a user gesture (click, touch)
   */
  const enableWakeLock = useCallback(async (): Promise<boolean> => {
    console.log('🔄 Attempting to enable wake lock...')
    
    let wakeLockSuccess = false
    
    // First make sure NoSleep is initialized
    initNoSleep()
    
    // Method 1: NoSleep.js (Primary method for mobile compatibility)
    if (noSleepRef.current) {
      try {
        console.log('Trying NoSleep.js wake lock...')
        await noSleepRef.current.enable()
        wakeLockSuccess = true
        setIsWakeLockActive(true)
        console.log('✅ NoSleep.js wake lock activated')
      } catch (err) {
        console.warn('❌ NoSleep.js wake lock failed:', err)
      }
    }
    
    // Method 2: Native Wake Lock API (if NoSleep failed or isn't available)
    if (!wakeLockSuccess && typeof window !== 'undefined') {
      if ('wakeLock' in navigator && navigator.wakeLock) {
        try {
          console.log('Trying native Wake Lock API...')
          const wakeLock = await navigator.wakeLock.request('screen')
          wakeLockRef.current = wakeLock
          wakeLockSuccess = true
          setIsWakeLockActive(true)
          console.log('✅ Native wake lock activated')
          
          // Handle unexpected release
          wakeLock.addEventListener('release', () => {
            console.log('⚠️ Native wake lock was released')
            wakeLockRef.current = null
            
            // Only update state if we haven't already activated NoSleep
            // We can't directly check if NoSleep is enabled, so we'll rely on our state
            if (!noSleepRef.current) {
              setIsWakeLockActive(false)
            }
          })
        } catch (err) {
          console.warn('❌ Native wake lock failed:', err)
        }
      }
    }
    
    // Final status update
    if (wakeLockSuccess) {
      console.log('🔒 Wake lock activated successfully')
    } else {
      console.error('💥 All wake lock methods failed')
      setIsWakeLockActive(false)
    }
    
    return wakeLockSuccess
  }, [initNoSleep])

  /**
   * Disable all active wake lock methods
   */
  const disableWakeLock = useCallback(async (): Promise<void> => {
    console.log('🔄 Disabling wake lock...')
    
    // Disable NoSleep.js
    if (noSleepRef.current) {
      try {
        noSleepRef.current.disable()
        console.log('✅ NoSleep.js wake lock disabled')
      } catch (err) {
        console.warn('❌ Failed to disable NoSleep.js:', err)
      }
    }
    
    // Disable native wake lock
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release()
        console.log('✅ Native wake lock released')
      } catch (err) {
        console.warn('❌ Failed to release native wake lock:', err)
      }
      wakeLockRef.current = null
    }
    
    setIsWakeLockActive(false)
    console.log('🛑 Wake lock disabled')
  }, [])

  // Handle page visibility changes and cleanup
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Re-enable wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isWakeLockActive) {
        console.log('📱 Page visible again, re-requesting wake lock')
        enableWakeLock()
      }
    }

    // Clean up when component unmounts
    const cleanUp = () => {
      if (isWakeLockActive) {
        disableWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', cleanUp)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', cleanUp)
      cleanUp()
    }
  }, [enableWakeLock, disableWakeLock, isWakeLockActive])

  return {
    isWakeLockSupported,
    isWakeLockActive,
    enableWakeLock,
    disableWakeLock
  }
}