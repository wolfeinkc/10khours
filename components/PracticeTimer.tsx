'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Play, Pause, Square, Music, Shield, ShieldOff, StickyNote, Settings } from 'lucide-react'
import debounce from 'lodash.debounce'
import { Database } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import MetronomeControl from '@/components/MetronomeControl'
import useScreenWakeLock from '@/hooks/useScreenWakeLock'
import { useToast, ToastContainer } from '@/components/ui/toast'

type Song = Database['public']['Tables']['songs']['Row']

interface PracticeTimerProps {
  song: Song
  onStop: () => void
  onEditSong?: (song: Song) => void
  onSongUpdated?: (updatedSong: Partial<Song>) => void
  onPracticeCompleted?: () => void
}

interface PracticeSession {
  startTime: Date
  endTime?: Date
  duration: number
  notes: string
  pauses: { start: Date; end?: Date }[]
}

interface MetronomeSettings {
  bpm: number
  volume: number
  sound: string
  accent: boolean
  timeSignature: number
}

export default function PracticeTimer({ song, onStop, onEditSong, onSongUpdated, onPracticeCompleted }: PracticeTimerProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const { toasts, success, error, removeToast } = useToast()
  const [seconds, setSeconds] = useState(0)
  const [, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [songNotes, setSongNotes] = useState(song.notes || '')
  const [showNotes, setShowNotes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTextareaFocused, setIsTextareaFocused] = useState(false)
  
  // Session tracking
  const sessionRef = useRef<PracticeSession | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
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
        
        // Show toast notification
        success('Notes saved successfully', 2000)
      } catch (err) {
        console.error('Error auto-saving notes:', err)
        // error('Failed to save notes')
      }
    }, 1000), // 1 second debounce
    [user, song.id, supabase, success]
  )

  // Auto-save notes when they change
  useEffect(() => {
    if (songNotes !== song.notes) {
      debouncedSaveNotes(songNotes)
    }
    
    // Cleanup debounce on unmount
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
      // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      disableWakeLock()
    }
  }, [disableWakeLock])

  // Manage wake lock based on practice state
  useEffect(() => {
    if (isRunning || isPaused) {
      // Enable wake lock when practicing (active or paused)
      console.log('Practice active/paused - requesting wake lock')
      enableWakeLock().then((success) => {
        if (success) {
          console.log('Wake lock enabled for practice session')
        } else {
          console.warn('Failed to enable wake lock - screen may timeout during practice')
        }
      })
    } else {
      // Only disable wake lock when practice is completely stopped
      console.log('Practice stopped - disabling wake lock')
      disableWakeLock()
    }
  }, [isRunning, isPaused, enableWakeLock, disableWakeLock])

  // Timer effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1)
        if (sessionRef.current) {
          sessionRef.current.duration = seconds + 1
        }
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
  }, [isRunning, isPaused, seconds])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusText = () => {
    if (!isRunning) return 'Ready to practice'
    if (isPaused) return 'Paused'
    return 'Practicing'
  }

  const getStatusColor = () => {
    if (!isRunning) return 'text-gray-600'
    if (isPaused) return 'text-yellow-600'
    return 'text-green-600'
  }

  const handlePlayPause = useCallback(async () => {
    if (!isRunning) {
      // Start practice - enable wake lock
      await enableWakeLock()
      setIsRunning(true)
      setIsPaused(false)
      if (sessionRef.current && sessionRef.current.pauses.length > 0) {
        // Resume from pause - close the last pause
        const lastPause = sessionRef.current.pauses[sessionRef.current.pauses.length - 1]
        if (!lastPause.end) {
          lastPause.end = new Date()
        }
      }
    } else if (!isPaused) {
      // Pause practice - keep wake lock active (don't disable)
      setIsPaused(true)
      if (sessionRef.current) {
        sessionRef.current.pauses.push({ start: new Date() })
      }
    } else {
      // Resume practice - re-enable wake lock
      await enableWakeLock()
      setIsPaused(false)
      if (sessionRef.current) {
        const lastPause = sessionRef.current.pauses[sessionRef.current.pauses.length - 1]
        if (lastPause && !lastPause.end) {
          lastPause.end = new Date()
        }
      }
    }
  }, [isRunning, isPaused, enableWakeLock])

  const savePracticeSession = async () => {
    if (!user || !sessionRef.current || seconds === 0) return

    setIsSaving(true)

    try {
      const durationMinutes = Math.max(1, Math.round(seconds / 60)) // Minimum 1 minute

      const { error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: user.id,
          song_id: song.id,
          duration_minutes: durationMinutes,
          notes: songNotes.trim() || null
        })

      if (error) {
        console.error('Error saving practice session:', error)
        // error('Failed to save practice session')
      } else {
        success(`Practice session saved: ${durationMinutes} minutes`)
        
        // Trigger refresh events for analytics and goals
        localStorage.setItem('practiceSessionCompleted', Date.now().toString())
        window.dispatchEvent(new CustomEvent('refreshAnalytics'))
        window.dispatchEvent(new CustomEvent('refreshGoals'))
      }
    } catch (error) {
      console.error('Error saving practice session:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStop = async () => {
    setIsRunning(false)
    setIsPaused(false)

    // Update session end time
    if (sessionRef.current) {
      sessionRef.current.endTime = new Date()
      sessionRef.current.notes = songNotes
    }

    // Save session to database
    await savePracticeSession()

    // Disable wake lock only after practice ends
    disableWakeLock()

    // Reset timer but keep song open
    setSeconds(0)
    
    // Initialize new session for potential next practice
    sessionRef.current = {
      startTime: new Date(),
      duration: 0,
      notes: songNotes,
      pauses: []
    }

    // Notify parent component that practice was completed
    onPracticeCompleted?.()
    
    // Note: Keep practice area open, just update displays
  }

  // Handle metronome settings save
  const handleMetronomeSettingsSave = useCallback(async (settings: MetronomeSettings) => {
    if (!user || !song) return

    try {
      const { error } = await supabase
        .from('songs')
        .update({ metronome_bpm: settings.bpm })
        .eq('id', song.id)
      
      if (error) throw error
      
      // Notify parent component of song update
      onSongUpdated?.({ metronome_bpm: settings.bpm })
      
      success('Metronome settings saved', 2000)
    } catch (err) {
      console.error('Error saving metronome settings:', err)
      error('Failed to save metronome settings')
    }
  }, [user, supabase, song, success, error])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [handlePlayPause])

  return (
    <>
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Main Timer Card - Mobile Optimized */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start space-y-3 sm:space-y-0">
            <div className="text-center sm:text-left flex-1">
              <CardTitle className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-1 sm:space-x-2">
                <div className="flex items-center space-x-2">
                  <Music className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  <span className="text-lg sm:text-xl font-bold">Practicing</span>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-base sm:text-lg font-semibold text-gray-900">{song.title}</div>
                  {song.artist && <div className="text-sm text-gray-600">by {song.artist}</div>}
                </div>
              </CardTitle>
              
              {/* Status and Wake Lock - Mobile Optimized */}
              <div className="mt-3 space-y-2">
                <div className="text-center sm:text-left">
                  <span className={`text-sm sm:text-base font-medium px-3 py-1 rounded-full ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                </div>
                
                {isWakeLockSupported && (
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    {isWakeLockActive ? (
                      <Shield className="h-4 w-4 text-green-600" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-xs sm:text-sm text-gray-600">
                      <span className="sm:hidden">
                        {isWakeLockActive ? 'Screen stays on' : 'Screen may timeout'}
                      </span>
                      <span className="hidden sm:inline">
                        Screen {isWakeLockActive ? 'locked' : 'unlocked'}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Edit Button - Mobile Optimized */}
            {onEditSong && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditSong(song)}
                title="Edit Song"
                className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation" // Larger touch target on mobile
              >
                <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-6 sm:space-y-8 px-4 sm:px-6">
          {/* Timer Display - Mobile Optimized */}
          <div className="py-4 sm:py-6">
            <div className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold text-blue-600 tracking-wider leading-none">
              {formatTime(seconds)}
            </div>
          </div>

          {/* Control Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Button
              onClick={handlePlayPause}
              size="lg"
              variant={isRunning && !isPaused ? 'destructive' : 'default'}
              className="w-full sm:w-auto min-w-[140px] h-12 sm:h-10 text-base sm:text-sm touch-manipulation"
            >
              {!isRunning ? (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  <span>Start Practice</span>
                </>
              ) : isPaused ? (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  <span>Pause</span>
                </>
              )}
            </Button>

            <Button
              onClick={handleStop}
              variant="outline"
              size="lg"
              disabled={seconds === 0 || isSaving}
              className="w-full sm:w-auto min-w-[140px] h-12 sm:h-10 text-base sm:text-sm touch-manipulation"
            >
              <Square className="h-4 w-4 mr-2" />
              <span>{isSaving ? 'Saving...' : 'Stop & Save'}</span>
            </Button>
          </div>

          {/* Notes Toggle - Mobile Optimized */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className="h-10 sm:h-8 px-4 sm:px-3 touch-manipulation"
            >
              <StickyNote className="h-4 w-4 mr-2" />
              <span className="text-sm sm:text-xs">{showNotes ? 'Hide Notes' : 'Add Notes'}</span>
            </Button>
          </div>
          
          {/* Song Notes - Mobile Optimized */}
          {showNotes && (
            <div className="space-y-3 text-left">
              <Label htmlFor="song-notes" className="text-sm font-medium">Song Notes</Label>
              <Textarea
                id="song-notes"
                placeholder="Add notes about this song, techniques, or things to remember..."
                value={songNotes}
                onChange={(e) => setSongNotes(e.target.value)}
                onFocus={() => setIsTextareaFocused(true)}
                onBlur={() => setIsTextareaFocused(false)}
                className="min-h-[120px] sm:min-h-[100px] text-base sm:text-sm touch-manipulation"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Metronome Control - Mobile Optimized */}
      <div className="w-full">
        <MetronomeControl 
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