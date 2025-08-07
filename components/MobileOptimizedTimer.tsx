'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX,
  Maximize2,
  Minimize2,
  Timer,
  Settings,
  StickyNote,
  Music
} from 'lucide-react'
import { Database } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import useScreenWakeLock from '@/hooks/useScreenWakeLock'
import useMetronome from '@/hooks/useMetronome'
import { useToast, ToastContainer } from '@/components/ui/toast'
import debounce from 'lodash.debounce'

type Song = Database['public']['Tables']['songs']['Row']

interface MobileOptimizedTimerProps {
  song: Song
  onStop: () => void
  onEditSong?: (song: Song) => void
  className?: string
}

interface PracticeSession {
  startTime: Date
  endTime?: Date
  duration: number
  notes: string
  pauses: { start: Date; end?: Date }[]
}

export default function MobileOptimizedTimer({ 
  song, 
  onStop: _onStop, // eslint-disable-line @typescript-eslint/no-unused-vars
  onEditSong,
  className 
}: MobileOptimizedTimerProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const { toasts, success, error, removeToast } = useToast()
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [songNotes, setSongNotes] = useState(song.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isTextareaFocused, setIsTextareaFocused] = useState(false)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sessionRef = useRef<PracticeSession | null>(null)

  const { isWakeLockActive, enableWakeLock, disableWakeLock } = useScreenWakeLock()
  const { 
    isPlaying: metronomeIsPlaying, 
    settings,
    updateSettings,
    start: startMetronome, 
    stop: stopMetronome,
    toggle,
    testSound
  } = useMetronome()

  // Initialize session and song data
  useEffect(() => {
    setSongNotes(song.notes || '')
    sessionRef.current = {
      startTime: new Date(),
      duration: 0,
      notes: '',
      pauses: []
    }
    
    if (song.metronome_bpm) {
      updateSettings({ bpm: song.metronome_bpm })
    }
  }, [song.id, song.notes, song.metronome_bpm, updateSettings])

  // Save notes function (no toast spam)
  const saveNotes = useCallback(async (notes: string) => {
    if (!user) return
    
    try {
      const { error: saveError } = await supabase
        .from('songs')
        .update({ notes })
        .eq('id', song.id)
      
      if (saveError) throw saveError
      
      // No toast for auto-save to prevent spam
    } catch (saveError) {
      console.error('Error auto-saving notes:', saveError)
      // Only show error toast for failed saves
      error('Failed to save notes')
    }
  }, [user, song.id, supabase, error])

  // Debounced version - create stable reference
  const debouncedSaveNotes = useMemo(
    () => debounce(saveNotes, 3000), // Longer delay to prevent spam
    [saveNotes]
  )

  // Auto-save notes when they change (prevent toast spam)
  useEffect(() => {
    if (songNotes !== song.notes && songNotes.trim() !== '') {
      debouncedSaveNotes(songNotes)
    }
    
    return () => {
      debouncedSaveNotes.cancel()
    }
  }, [songNotes, song.notes, debouncedSaveNotes])

  // Auto-hide controls in fullscreen mode
  useEffect(() => {
    if (isFullscreen && showControls) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [isFullscreen, showControls])

  // Manage wake lock to prevent screen timeout during practice
  useEffect(() => {
    const manageWakeLock = async () => {
      if (isRunning || isPaused) {
        // Keep screen active during practice or pause (both normal and fullscreen)
        try {
          await enableWakeLock()
        } catch (wakeLockError) {
          console.log('Wake lock not supported:', wakeLockError)
        }
      } else {
        // Re-enable screen timeout when practice stops
        try {
          await disableWakeLock()
        } catch (wakeLockError) {
          console.log('Wake lock disable failed:', wakeLockError)
        }
      }
    }
    
    manageWakeLock()
  }, [isRunning, isPaused, enableWakeLock, disableWakeLock])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Save practice session to database
  const savePracticeSession = useCallback(async () => {
    if (!user || !sessionRef.current) return

    try {
      setIsSaving(true)
      const session = sessionRef.current
      const durationMinutes = Math.round(session.duration / 60)

      if (durationMinutes > 0) {
        const { error } = await supabase
          .from('practice_sessions')
          .insert({
            song_id: song.id,
            user_id: user.id,
            duration_minutes: durationMinutes,
            notes: songNotes
          })

        if (error) throw error

        // Trigger refresh events for analytics and goals
        localStorage.setItem('practiceSessionCompleted', Date.now().toString())
        window.dispatchEvent(new CustomEvent('refreshAnalytics'))
        window.dispatchEvent(new CustomEvent('refreshGoals'))
      }
    } catch (sessionError) {
      console.error('Error saving practice session:', sessionError)
    } finally {
      setIsSaving(false)
    }
  }, [user, song.id, songNotes, supabase])

  const handleStart = async () => {
    if (isPaused) {
      // Resume
      setIsPaused(false)
      if (sessionRef.current) {
        // End the current pause
        const currentPause = sessionRef.current.pauses[sessionRef.current.pauses.length - 1]
        if (currentPause && !currentPause.end) {
          currentPause.end = new Date()
        }
      }
    } else {
      // Fresh start
      setTime(0)
      sessionRef.current = {
        startTime: new Date(),
        duration: 0,
        notes: songNotes,
        pauses: []
      }
    }
    
    setIsRunning(true)
    
    // Clear any existing interval to prevent duplicates
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Start the timer interval
    intervalRef.current = setInterval(() => {
      setTime(prev => {
        const newTime = prev + 1
        if (sessionRef.current) {
          sessionRef.current.duration = newTime
        }
        return newTime
      })
    }, 1000)

    // Wake lock is now managed by useEffect based on practice state
  }

  const handlePause = () => {
    setIsRunning(false)
    setIsPaused(true)
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Record pause start time
    if (sessionRef.current) {
      sessionRef.current.pauses.push({ start: new Date() })
    }

    stopMetronome()
  }

  const handleStop = async () => {
    if (time === 0 || isSaving) return
    
    setIsRunning(false)
    setIsPaused(false)
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Update session end time and save
    if (sessionRef.current) {
      sessionRef.current.endTime = new Date()
      sessionRef.current.notes = songNotes
    }

    await savePracticeSession()
    
    stopMetronome()
    
    // Reset timer but keep song open (like desktop version)
    setTime(0)
    
    // Wake lock will be disabled by useEffect when isRunning becomes false
    
    // Initialize new session for potential next practice
    sessionRef.current = {
      startTime: new Date(),
      duration: 0,
      notes: songNotes,
      pauses: []
    }
    
    success('Practice session saved successfully!', 3000)
    
    // Note: Don't call onStop() to keep song open like desktop version
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    setShowControls(true)
  }

  const handleScreenTap = () => {
    if (isFullscreen) {
      setShowControls(true)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      // Wake lock cleanup handled by useEffect
      stopMetronome()
    }
  }, [stopMetronome])

  const timerContent = (
    <div 
      className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black text-white' : ''}`}
      onClick={handleScreenTap}
    >
      <Card className={`${isFullscreen ? 'h-full border-none bg-gray-900' : ''} ${className}`}>
        <CardContent className={`${isFullscreen ? 'h-full flex flex-col justify-center items-center p-8 text-white' : 'p-6'}`}>
          {/* Song info with settings button */}
          <div className={`text-center mb-6 ${isFullscreen ? 'mb-12' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Music className={`text-blue-600 ${isFullscreen ? 'h-8 w-8' : 'h-5 w-5'}`} />
                  <h2 className={`font-bold ${isFullscreen ? 'text-3xl text-white' : 'text-xl'}`}>
                    {song.title}
                  </h2>
                </div>
                {song.artist && (
                  <p className={`${isFullscreen ? 'text-xl text-gray-300' : 'text-sm text-muted-foreground'}`}>
                    by {song.artist}
                  </p>
                )}
              </div>
              
              {/* Settings Button */}
              {onEditSong && !isFullscreen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditSong(song)}
                  className="h-10 w-10 touch-manipulation flex-shrink-0 border-gray-300"
                  title="Edit Song & Metronome"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Timer display */}
          <div className={`text-center mb-8 ${isFullscreen ? 'mb-16' : ''}`}>
            <div className={`font-mono font-bold ${isFullscreen ? 'text-8xl md:text-9xl text-white' : 'text-4xl md:text-5xl'}`}>
              {formatTime(time)}
            </div>

            <div className="flex justify-center items-center space-x-4 mt-4">
              {isRunning && (
                <Badge variant="default" className="animate-pulse">
                  <Timer className="w-3 h-3 mr-1" />
                  Practicing
                </Badge>
              )}
              {isWakeLockActive && (
                <Badge variant="outline" className={isFullscreen ? 'text-white border-white' : ''}>
                  Screen Active
                </Badge>
              )}
              {metronomeIsPlaying && (
                <Badge variant="secondary" className={isFullscreen ? 'text-white bg-blue-600' : ''}>
                  ♪ {settings.bpm} BPM
                </Badge>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className={`transition-opacity duration-300 ${
            isFullscreen && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>
            {/* Enhanced Mobile-First Controls */}
            <div className={`space-y-4 ${isFullscreen ? 'space-y-8' : ''}`}>
              {/* Primary Controls */}
              <div className={`flex justify-center items-center space-x-4 ${isFullscreen ? 'space-x-8' : ''}`}>
                {!isRunning ? (
                  <Button
                    size={isFullscreen ? 'lg' : 'lg'}
                    onClick={handleStart}
                    className={`${isFullscreen ? 'h-24 w-24 rounded-full text-white bg-green-600 hover:bg-green-700 border-2 border-green-500' : 'h-12 w-32 touch-manipulation'}`}
                  >
                    <Play className={`${isFullscreen ? 'h-12 w-12' : 'h-5 w-5'} ${!isFullscreen ? 'mr-2' : ''}`} />
                    {!isFullscreen && <span>Start</span>}
                  </Button>
                ) : (
                  <Button
                    size={isFullscreen ? 'lg' : 'lg'}
                    onClick={handlePause}
                    variant="secondary"
                    className={`${isFullscreen ? 'h-24 w-24 rounded-full text-white bg-yellow-600 hover:bg-yellow-700 border-2 border-yellow-500' : 'h-12 w-32 touch-manipulation'}`}
                  >
                    <Pause className={`${isFullscreen ? 'h-12 w-12' : 'h-5 w-5'} ${!isFullscreen ? 'mr-2' : ''}`} />
                    {!isFullscreen && <span>Pause</span>}
                  </Button>
                )}

                <Button
                  size={isFullscreen ? 'lg' : 'lg'}
                  onClick={handleStop}
                  variant="destructive"
                  disabled={time === 0 || isSaving}
                  className={`${isFullscreen ? 'h-24 w-24 rounded-full text-white bg-red-600 hover:bg-red-700 border-2 border-red-500' : 'h-12 w-32 touch-manipulation'}`}
                >
                  <Square className={`${isFullscreen ? 'h-12 w-12' : 'h-5 w-5'} ${!isFullscreen ? 'mr-2' : ''}`} />
                  {!isFullscreen && <span>{isSaving ? 'Saving...' : 'Stop'}</span>}
                </Button>
              </div>

              {/* Secondary Controls */}
              <div className={`flex justify-center items-center space-x-3 ${isFullscreen ? 'space-x-6' : ''}`}>
                {/* Metronome toggle */}
                {song.metronome_bpm && (
                  <div className="flex flex-col items-center space-y-1">
                    <Button
                      size={isFullscreen ? 'lg' : 'default'}
                      onClick={async () => {
                        console.log('Metronome button clicked, current state:', metronomeIsPlaying)
                        try {
                          // Direct start/stop logic without toggle to avoid React state timing issues
                          if (metronomeIsPlaying) {
                            stopMetronome()
                            success('Metronome stopped')
                          } else {
                            await startMetronome()
                            success(`Metronome started at ${song.metronome_bpm} BPM`)
                          }
                        } catch (err) {
                          console.error('Metronome error:', err)
                          error('Failed to start metronome. Please check your browser audio settings.')
                        }
                      }}
                      variant={metronomeIsPlaying ? 'default' : 'outline'}
                      className={`${isFullscreen ? 'h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white' : 'h-10 w-10 touch-manipulation'}`}
                      title={`${metronomeIsPlaying ? 'Stop' : 'Start'} Metronome`}
                    >
                      {metronomeIsPlaying ? (
                        <Volume2 className={`${isFullscreen ? 'h-6 w-6' : 'h-4 w-4'}`} />
                      ) : (
                        <VolumeX className={`${isFullscreen ? 'h-6 w-6' : 'h-4 w-4'}`} />
                      )}
                    </Button>
                    
                    {/* Temporary Test Audio Button */}
                    <Button
                      size={isFullscreen ? 'lg' : 'default'}
                      onClick={async () => {
                        console.log('Test audio button clicked')
                        try {
                          await testSound()
                          success('Test sound played - did you hear it?')
                        } catch (err) {
                          console.error('Test sound error:', err)
                          error('Test sound failed')
                        }
                      }}
                      variant="secondary"
                      className={`${isFullscreen ? 'h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 text-white' : 'h-10 w-10 touch-manipulation'}`}
                      title="Test Audio Output"
                    >
                      🔊
                    </Button>
                    {!isFullscreen && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Metronome</div>
                        <div className="text-xs text-blue-600 font-medium">{song.metronome_bpm} BPM</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes toggle */}
                {!isFullscreen && (
                  <div className="flex flex-col items-center space-y-1">
                    <Button
                      variant={showNotes ? 'default' : 'outline'}
                      size="default"
                      onClick={() => setShowNotes(!showNotes)}
                      className="h-10 w-10 touch-manipulation"
                      title={`${showNotes ? 'Hide' : 'Show'} Song Notes`}
                    >
                      <StickyNote className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-gray-500">Notes</span>
                  </div>
                )}

                {/* Settings button (in fullscreen) */}
                {onEditSong && isFullscreen && (
                  <div className="flex flex-col items-center space-y-1">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => onEditSong(song)}
                      className="h-12 w-12 rounded-full"
                      title="Edit Song & Metronome Settings"
                    >
                      <Settings className="h-6 w-6" />
                    </Button>
                    <span className="text-xs text-gray-400">Settings</span>
                  </div>
                )}

                {/* Fullscreen toggle */}
                <div className="flex flex-col items-center space-y-1">
                  <Button
                    size={isFullscreen ? 'lg' : 'default'}
                    onClick={toggleFullscreen}
                    variant="ghost"
                    className={`${isFullscreen ? 'h-12 w-12 rounded-full' : 'h-10 w-10 touch-manipulation'}`}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className={`${isFullscreen ? 'h-6 w-6' : 'h-4 w-4'}`} />
                    ) : (
                      <Maximize2 className={`${isFullscreen ? 'h-6 w-6' : 'h-4 w-4'}`} />
                    )}
                  </Button>
                  {!isFullscreen && (
                    <span className="text-xs text-gray-500">Fullscreen</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes Section - Only in non-fullscreen mode */}
            {!isFullscreen && showNotes && (
              <div className="mt-6 space-y-3 text-left">
                <Label htmlFor="mobile-song-notes" className="text-sm font-medium">Song Notes</Label>
                <Textarea
                  id="mobile-song-notes"
                  placeholder="Add notes about this song, techniques, or things to remember..."
                  value={songNotes}
                  onChange={(e) => setSongNotes(e.target.value)}
                  onFocus={() => setIsTextareaFocused(true)}
                  onBlur={() => setIsTextareaFocused(false)}
                  className="min-h-[120px] text-base touch-manipulation"
                  style={{ fontSize: '16px' }} // Prevent zoom on iOS
                />
              </div>
            )}

            {/* Instructions */}
            {isFullscreen && (
              <div className="text-center mt-8 text-sm text-gray-300">
                Tap screen to show/hide controls • Screen stays active during practice
              </div>
            )}
            
            {!isFullscreen && (
              <div className="text-center mt-4 text-xs text-gray-500 space-y-1">
                <div>Tap fullscreen for distraction-free practice</div>
                {isTextareaFocused && <div className="text-amber-600">(spacebar disabled while typing)</div>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <>
      {timerContent}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
