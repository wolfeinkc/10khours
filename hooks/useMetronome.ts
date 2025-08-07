'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface MetronomeSettings {
  bpm: number
  volume: number
  sound: 'click' | 'beep' | 'wood' | 'digital'
  accent: boolean
  timeSignature: number
}

export default function useMetronome() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [settings, setSettings] = useState<MetronomeSettings>({
    bpm: 120,
    volume: 1.0, // Increased volume to maximum
    sound: 'click',
    accent: true,
    timeSignature: 4
  })
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const beatCountRef = useRef(0)
  const [currentBeat, setCurrentBeat] = useState(0)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const createSound = useCallback((frequency: number, duration: number, volume: number) => {
    console.log('createSound called:', { frequency, duration, volume, audioContext: !!audioContextRef.current })
    
    if (!audioContextRef.current) {
      console.error('No audio context available')
      return
    }

    console.log('Audio context state:', audioContextRef.current.state)

    try {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      // Set sound type based on settings
      switch (settings.sound) {
        case 'click':
          oscillator.type = 'square'
          frequency = frequency * 2
          break
        case 'beep':
          oscillator.type = 'sine'
          break
        case 'wood':
          oscillator.type = 'sawtooth'
          frequency = frequency * 0.5
          break
        case 'digital':
          oscillator.type = 'triangle'
          break
      }
      
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration)
      
      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + duration)
      
      console.log('Sound created and started successfully')
    } catch (error) {
      console.error('Error creating sound:', error)
    }
  }, [settings.sound])

  const playBeat = useCallback(() => {
    console.log('playBeat called, beat count:', beatCountRef.current)
    const isAccentBeat = settings.accent && (beatCountRef.current % settings.timeSignature === 0)
    const frequency = isAccentBeat ? 800 : 400
    const volume = settings.volume * (isAccentBeat ? 1.2 : 1)
    const duration = 0.1
    
    console.log('Playing beat:', { isAccentBeat, frequency, volume, duration })
    createSound(frequency, duration, volume)
    beatCountRef.current++
  }, [settings.accent, settings.timeSignature, settings.volume, createSound])

  // Add a ref to prevent double start calls
  const startInProgressRef = useRef(false)

  const start = useCallback(async () => {
    console.log('Metronome start called, current state:', { isPlaying, bpm: settings.bpm })
    
    if (isPlaying || startInProgressRef.current) {
      console.log('Metronome already playing or start in progress, returning')
      return
    }

    startInProgressRef.current = true

    try {
      // Initialize audio context if not available
      if (!audioContextRef.current && typeof window !== 'undefined') {
        console.log('Creating new audio context')
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      if (!audioContextRef.current) {
        throw new Error('Audio context not available')
      }

      console.log('Audio context state before resume:', audioContextRef.current.state)

      // Resume audio context if suspended (required by browsers)
      if (audioContextRef.current.state === 'suspended') {
        console.log('Resuming suspended audio context')
        await audioContextRef.current.resume()
        console.log('Audio context state after resume:', audioContextRef.current.state)
      }

      setIsPlaying(true)
      beatCountRef.current = 0
      
      const interval = 60000 / settings.bpm // Convert BPM to milliseconds
      console.log('Setting metronome interval:', interval, 'ms for BPM:', settings.bpm)
      
      // Play first beat immediately
      console.log('Playing first beat immediately')
      playBeat()
      
      console.log('Setting up interval for subsequent beats')
      intervalRef.current = setInterval(() => {
        console.log('Interval fired - playing beat', beatCountRef.current + 1)
        
        // Play beat with current settings
        const isAccentBeat = settings.accent && (beatCountRef.current % settings.timeSignature === 0)
        const frequency = isAccentBeat ? 800 : 400
        const volume = settings.volume * (isAccentBeat ? 1.2 : 1)
        const duration = 0.1
        
        console.log('Playing interval beat:', { isAccentBeat, frequency, volume, duration })
        createSound(frequency, duration, volume)
        beatCountRef.current++
        
        setCurrentBeat(beatCountRef.current % settings.timeSignature + 1)
      }, interval)
      
      console.log('Metronome started successfully')
    } catch (error) {
      console.error('Failed to start metronome:', error)
      setIsPlaying(false)
      throw error
    } finally {
      startInProgressRef.current = false
    }
  }, [isPlaying, settings.bpm, playBeat])

  const stop = useCallback(() => {
    console.log('Stopping metronome, interval exists:', !!intervalRef.current)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPlaying(false)
    setCurrentBeat(0)
    console.log('Metronome stopped')
  }, [])

  // Add a ref to prevent double execution
  const toggleInProgressRef = useRef(false)

  const toggle = useCallback(async () => {
    // Prevent double execution
    if (toggleInProgressRef.current) {
      console.log('Toggle already in progress, ignoring')
      return
    }

    toggleInProgressRef.current = true
    console.log('Toggle starting, current isPlaying:', isPlaying)

    try {
      if (isPlaying) {
        console.log('Calling stop()')
        stop()
      } else {
        console.log('Calling start()')
        await start()
      }
    } finally {
      // Reset the flag after a short delay to allow state to update
      setTimeout(() => {
        toggleInProgressRef.current = false
        console.log('Toggle completed, flag reset')
      }, 100)
    }
  }, [isPlaying, start, stop])

  // Test function to verify audio is working
  const testSound = useCallback(async () => {
    console.log('Testing audio output...')
    
    try {
      // Initialize audio context if needed
      if (!audioContextRef.current && typeof window !== 'undefined') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      if (!audioContextRef.current) {
        throw new Error('Audio context not available')
      }

      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      // Play a loud, clear test tone
      createSound(440, 0.5, 1.0) // A4 note for 0.5 seconds at full volume
      console.log('Test sound played - you should hear a 0.5 second tone')
    } catch (error) {
      console.error('Test sound failed:', error)
    }
  }, [createSound])

  const updateSettings = useCallback((newSettings: Partial<MetronomeSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
    
    // If BPM changed while playing, restart with new tempo
    if (newSettings.bpm && isPlaying) {
      stop()
      setTimeout(() => start(), 50) // Small delay to ensure clean restart
    }
  }, [isPlaying, start, stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    isPlaying,
    currentBeat,
    settings,
    start,
    stop,
    toggle,
    updateSettings,
    testSound
  }
}
