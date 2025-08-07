'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Play, Pause, Square, Shield, ShieldOff, StickyNote, Maximize2, Minimize2 } from 'lucide-react'
import debounce from 'lodash.debounce'
import { Database } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import MobileMetronomeControl from '@/components/MobileMetronomeControl'
import useScreenWakeLock from '@/hooks/useScreenWakeLock'
import { useToast, ToastContainer } from '@/components/ui/toast'

type Song = Database['public']['Tables']['songs']['Row']

interface MobilePracticeTimerProps {
  song: Song
  onStop: () => void
  onEditSong?: (song: Song) => void
  onSongUpdated?: (updatedSong: Partial<Song>) => void
  onPracticeCompleted?: () => void
  className?: string
}

interface PracticeSession {
  startTime: Date
  endTime?: Date
  duration: number
  notes: string
  pauses: { start: Date; end?: Date }[]
}

export default function MobilePracticeTimer({ 
  song, 
  onStop, 
  onEditSong,
  onSongUpdated,
  onPracticeCompleted,
  className = ''
}: MobilePracticeTimerProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const { toasts, success, error, removeToast } = useToast()
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [songNotes, setSongNotes] = useState(song.notes || '')
  const [showNotes, setShowNotes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTextareaFocused, setIsTextareaFocused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  // Session tracking
  const sessionRef = useRef<PracticeSession | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const { isWakeLockSupported, isWakeLockActive, enableWakeLock, disableWakeLock } = useScreenWakeLock()

  // Load song notes when component mounts or song changes
  useEffect(() => {
    setSongNotes(song.notes || '')
  }, [song.id, song.notes])

  // Debounced save function for song notes
  const debouncedSaveNotes = useCallback(
    debounce(async (notes: string) => {
      if (!user) return
      
      try {
        const { error } = await supabase
          .from('songs')
          .update({ notes })
          .eq('id', song.id)
        
        if (error) throw error
        
        // Notify parent component of song update
        onSongUpdated?.({ notes })
        
        success('Notes saved successfully', 2000)
      } catch (err) {
        console.error('Error auto-saving notes:', err)
      }
    }, 1000), // 1 second debounce
    [user, song.id, supabase, onSongUpdated, success]
  )

  // Auto-save notes when they change
  useEffect(() => {
    if (songNotes !== song.notes) {
      debouncedSaveNotes(songNotes)
    }
    
    return () => {
      debouncedSaveNotes.cancel()
    }
  }, [songNotes, debouncedSaveNotes, song.notes])

  // Initialize session when component mounts
  useEffect(() => {
    sessionRef.current = {
      startTime: new Date(),
      duration: 0,
      notes: '',
      pauses: []
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      disableWakeLock()
    }
  }, [disableWakeLock])

  // Manage wake lock based on practice state
  useEffect(() => {
    if (isRunning && !isPaused) {
      if (isWakeLockSupported) {
        enableWakeLock().then((success) => {
          if (success) {
            console.log('Wake lock enabled for practice session')
          }
        })
      }
    }
  }, [isRunning, isPaused, isWakeLockSupported, enableWakeLock])

  // Timer effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, isPaused])

  // Auto-hide controls in fullscreen
  useEffect(() => {
    if (isFullscreen && isRunning && !isPaused) {
      const resetTimeout = () => {
        if (hideControlsTimeoutRef.current) {
          clearTimeout(hideControlsTimeoutRef.current)
        }
        setShowControls(true)
        hideControlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false)
        }, 3000)
      }

      resetTimeout()
      
      const handleUserActivity = () => {
        resetTimeout()
      }

      document.addEventListener('touchstart', handleUserActivity)
      document.addEventListener('click', handleUserActivity)

      return () => {
        document.removeEventListener('touchstart', handleUserActivity)
        document.removeEventListener('click', handleUserActivity)
        if (hideControlsTimeoutRef.current) {
          clearTimeout(hideControlsTimeoutRef.current)
        }
      }
    } else {
      setShowControls(true)
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [isFullscreen, isRunning, isPaused])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPause = useCallback(async () => {
    if (!isRunning) {
      // Starting practice - enable wake lock
      await enableWakeLock()
      setIsRunning(true)
      setIsPaused(false)
      if (sessionRef.current) {
        sessionRef.current.startTime = new Date()
      }
    } else if (isPaused) {
      // Resuming from pause - re-enable wake lock
      await enableWakeLock()
      setIsPaused(false)
      if (sessionRef.current) {
        const lastPause = sessionRef.current.pauses[sessionRef.current.pauses.length - 1]
        if (lastPause && !lastPause.end) {
          lastPause.end = new Date()
        }
      }
    } else {
      // Pausing practice - keep wake lock active (don't disable)
      setIsPaused(true)
      if (sessionRef.current) {
        sessionRef.current.pauses.push({ start: new Date() })
      }
    }
  }, [isRunning, isPaused, enableWakeLock])

  // Auto-save metronome settings when they change
  const handleMetronomeSettingsSave = useCallback(async (settings: any) => {
    if (!user || !song) return

    try {
      const { error } = await supabase
        .from('songs')
        .update({ metronome_bpm: settings.bpm })
        .eq('id', song.id)
      
      if (error) throw error
      
      // Notify parent component of song update via callback
      // This updates UI without opening modals
      onSongUpdated?.({ metronome_bpm: settings.bpm })
      
      // Show a single toast notification
      success('Metronome settings saved', 2000)
    } catch (err) {
      console.error('Error saving metronome settings:', err)
      error('Failed to save metronome settings')
    }
  }, [user, supabase, song, success, error, onSongUpdated])

  const savePracticeSession = async () => {
    if (!user || !sessionRef.current || seconds === 0) return

    setIsSaving(true)
    
    try {
      const session = sessionRef.current
      const endTime = new Date()
      
      // Calculate total pause time
      let totalPauseTime = 0
      session.pauses.forEach(pause => {
        const pauseEnd = pause.end || endTime
        totalPauseTime += pauseEnd.getTime() - pause.start.getTime()
      })
      
      // Calculate actual practice duration (excluding pauses)
      const totalTime = endTime.getTime() - session.startTime.getTime()
      const practiceTime = Math.max(0, totalTime - totalPauseTime)
      const durationMinutes = Math.round(practiceTime / (1000 * 60))

      const { error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: user.id,
          song_id: song.id,
          duration_minutes: durationMinutes,
          notes: songNotes || ''
        })

      if (error) throw error

      success(`Practice session saved: ${durationMinutes} minutes`)
    } catch (err) {
      console.error('Error saving practice session:', err)
      error('Failed to save practice session')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStop = async () => {
    await savePracticeSession()
    setIsRunning(false)
    setIsPaused(false)
    setSeconds(0)
    // Disable wake lock when practice session ends
    await disableWakeLock()
    onStop()
  }

  // Keyboard event handler for spacebar
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Only handle spacebar if no input/textarea is focused
    const activeElement = document.activeElement as HTMLElement
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    )
    
    if (e.code === 'Space' && !isInputFocused) {
      e.preventDefault()
      handlePlayPause()
    }
  }, [handlePlayPause])

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black text-white z-50 flex flex-col">
        {/* Fullscreen Timer Display */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl md:text-8xl font-mono font-bold text-blue-400 mb-4">
              {formatTime(seconds)}
            </div>
            <div className="text-xl md:text-2xl text-gray-300">
              {song.title} {song.artist && `by ${song.artist}`}
            </div>
          </div>
        </div>

        {/* Fullscreen Controls */}
        <div className={`transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="p-6 bg-black bg-opacity-50">
            <div className="flex justify-center items-center space-x-6">
              <Button
                onClick={handlePlayPause}
                size="lg"
                variant={isRunning && !isPaused ? 'destructive' : 'default'}
                className="h-16 w-16 rounded-full text-white"
              >
                {!isRunning ? (
                  <Play className="h-8 w-8" />
                ) : isPaused ? (
                  <Play className="h-8 w-8" />
                ) : (
                  <Pause className="h-8 w-8" />
                )}
              </Button>

              <Button
                onClick={handleStop}
                variant="outline"
                size="lg"
                disabled={seconds === 0 || isSaving}
                className="h-16 w-16 rounded-full text-white border-white"
              >
                <Square className="h-8 w-8" />
              </Button>

              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="lg"
                className="h-16 w-16 rounded-full text-white"
              >
                <Minimize2 className="h-8 w-8" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className={`space-y-4 ${className}`}>
      {/* Main Timer Card */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex flex-col">
              <span className="font-bold">{song.title}</span>
              {song.artist && <span className="text-sm text-gray-600 font-normal">{song.artist}</span>}
            </div>
            <div className="flex items-center space-x-2">
              {isWakeLockSupported && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isWakeLockActive ? disableWakeLock : () => enableWakeLock()}
                  className="h-8 w-8"
                  title={isWakeLockActive ? 'Disable screen wake lock' : 'Enable screen wake lock'}
                >
                  {isWakeLockActive ? (
                    <Shield className="h-4 w-4 text-green-600" />
                  ) : (
                    <ShieldOff className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="h-8 w-8"
                title="Enter fullscreen mode"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6 px-4">
          {/* Timer Display */}
          <div className="py-6">
            <div className="text-5xl md:text-6xl font-mono font-bold text-blue-600 tracking-wider">
              {formatTime(seconds)}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-col space-y-3">
            <Button
              onClick={handlePlayPause}
              size="lg"
              variant={isRunning && !isPaused ? 'destructive' : 'default'}
              className="w-full h-14 text-lg touch-manipulation"
            >
              {!isRunning ? (
                <>
                  <Play className="h-6 w-6 mr-3" />
                  <span>Start Practice</span>
                </>
              ) : isPaused ? (
                <>
                  <Play className="h-6 w-6 mr-3" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-6 w-6 mr-3" />
                  <span>Pause</span>
                </>
              )}
            </Button>

            <Button
              onClick={handleStop}
              variant="outline"
              size="lg"
              disabled={seconds === 0 || isSaving}
              className="w-full h-14 text-lg touch-manipulation"
            >
              <Square className="h-5 w-5 mr-3" />
              <span>{isSaving ? 'Saving...' : 'Stop & Save'}</span>
            </Button>
          </div>

          {/* Notes Toggle */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className="h-12 px-6 touch-manipulation"
            >
              <StickyNote className="h-5 w-5 mr-2" />
              <span>{showNotes ? 'Hide Notes' : 'Add Notes'}</span>
            </Button>
          </div>
          
          {/* Song Notes */}
          {showNotes && (
            <div className="space-y-3 text-left">
              <Label htmlFor="song-notes" className="text-base font-medium">Song Notes</Label>
              <Textarea
                id="song-notes"
                placeholder="Add notes about this song, techniques, or things to remember..."
                value={songNotes}
                onChange={(e) => setSongNotes(e.target.value)}
                onFocus={() => setIsTextareaFocused(true)}
                onBlur={() => setIsTextareaFocused(false)}
                className="min-h-[120px] text-base touch-manipulation"
                style={{ fontSize: '16px' }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Mobile Metronome Control */}
      <div className="w-full">
        <MobileMetronomeControl 
          initialBpm={song.metronome_bpm || 120}
          className="bg-white w-full"
          onSave={handleMetronomeSettingsSave}
        />
      </div>
    </div>
    
    {/* Toast Container */}
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
