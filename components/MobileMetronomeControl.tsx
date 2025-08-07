'use client'

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Play, Pause, Settings, Volume2, Loader2 } from 'lucide-react'
import useMetronome, { MetronomeSettings } from '@/hooks/useMetronome'
import debounce from 'lodash.debounce'
import useDebouncedSlider from '@/hooks/useDebouncedSlider'

interface MobileMetronomeControlProps {
  initialBpm?: number
  onSettingsChange?: (settings: MetronomeSettings) => void
  onSave?: (settings: MetronomeSettings) => void
  className?: string
}

export default function MobileMetronomeControl({ 
  initialBpm = 120, 
  onSettingsChange,
  onSave,
  className = '' 
}: MobileMetronomeControlProps) {
  const { isPlaying, settings, start, stop, toggle, updateSettings } = useMetronome()
  const [showSettings, setShowSettings] = useState(false)
  const { success } = useToast()

  // Initialize with song BPM if provided
  useState(() => {
    if (initialBpm !== settings.bpm) {
      updateSettings({ bpm: initialBpm })
    }
  })

  // Use debounced slider hook for BPM control
  const bpmSlider = useDebouncedSlider<number>({
    initialValue: settings.bpm,
    onSave: (value) => {
      handleBpmSave(value)
      if (onSave) onSave({ ...settings, bpm: value })
      if (success) success(`BPM set to ${value}`, 2000)
    }
  })

  // Use debounced slider hook for volume control
  const volumeSlider = useDebouncedSlider<number>({
    initialValue: settings.volume * 100,
    onSave: (value) => {
      handleVolumeSave(value)
      if (onSave) onSave({ ...settings, volume: value / 100 })
      if (success) success(`Volume set to ${Math.round(value)}%`, 2000)
    }
  })

  const handleSettingsUpdate = (newSettings: Partial<MetronomeSettings>) => {
    updateSettings(newSettings)
    onSettingsChange?.({ ...settings, ...newSettings })
    
    // If this is a non-slider setting (like sound, accent, etc.), save immediately
    if (!('bpm' in newSettings) && !('volume' in newSettings)) {
      if (onSave) {
        onSave({ ...settings, ...newSettings })
        success('Metronome settings saved', 2000)
      }
    }
  }

  // Let the hook handle initialization with settings
  // No need for additional initialization effect

  // Direct handlers for BPM and volume changes
  const handleBpmSave = useCallback((newBpm: number) => {
    updateSettings({ bpm: newBpm })
    if (onSettingsChange) {
      onSettingsChange({ ...settings, bpm: newBpm })
    }
  }, [settings, updateSettings, onSettingsChange])
  
  const handleVolumeSave = useCallback((newVolumePercent: number) => {
    const newVolume = newVolumePercent / 100
    updateSettings({ volume: newVolume })
    if (onSettingsChange) {
      onSettingsChange({ ...settings, volume: newVolume })
    }
  }, [settings, updateSettings, onSettingsChange])
  
  // No need for additional effects to sync values - the hook handles this internally

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="font-bold">Metronome</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="h-10 w-10 touch-manipulation"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 px-4">
        {/* BPM Display and Control - Mobile Optimized */}
        <div className="text-center space-y-4">
          <div className="py-2">
            <div className="text-4xl font-bold text-blue-600 mb-1">
              {settings.bpm}
            </div>
            <div className="text-base text-gray-600 font-medium">
              BPM
            </div>

          </div>

          <Button
            onClick={toggle}
            variant={isPlaying ? "destructive" : "default"}
            size="lg"
            className="w-full h-14 text-lg touch-manipulation font-semibold"
          >
            {isPlaying ? (
              <>
                <Pause className="h-6 w-6 mr-3" />
                <span>Stop Metronome</span>
              </>
            ) : (
              <>
                <Play className="h-6 w-6 mr-3" />
                <span>Start Metronome</span>
              </>
            )}
          </Button>
        </div>



        {/* Settings Panel - Mobile Optimized */}
        {showSettings && (
          <div className="space-y-5 pt-4 border-t">
            {/* Tempo Control - Now in Settings */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Tempo</Label>
              <div className="px-2">
                <Slider
                  value={[bpmSlider.value]}
                  onValueChange={(value) => bpmSlider.handlers.onChange(value[0])}
                  onMouseDown={() => bpmSlider.handlers.onStart()}
                  onTouchStart={() => bpmSlider.handlers.onStart()}
                  onMouseUp={() => bpmSlider.handlers.onEnd()}
                  onTouchEnd={() => bpmSlider.handlers.onEnd()}
                  min={40}
                  max={200}
                  step={1}
                  className="w-full touch-manipulation"
                />
                {/* Pending save indicator */}
                {bpmSlider.isPending && !bpmSlider.isInteracting && (
                  <div className="flex justify-end mt-1">
                    <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex justify-between text-sm text-gray-500 px-2">
                <span>40 BPM</span>
                <span>200 BPM</span>
              </div>
            </div>
            {/* Volume Control - Mobile Optimized */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center">
                <Volume2 className="h-4 w-4 mr-2" />
                Volume
              </Label>
              <div className="px-2">
                <Slider
                  value={[volumeSlider.value]}
                  onValueChange={(value) => volumeSlider.handlers.onChange(value[0])}
                  onMouseDown={() => volumeSlider.handlers.onStart()}
                  onTouchStart={() => volumeSlider.handlers.onStart()}
                  onMouseUp={() => volumeSlider.handlers.onEnd()}
                  onTouchEnd={() => volumeSlider.handlers.onEnd()}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full touch-manipulation"
                />
                {/* Pending save indicator */}
                {volumeSlider.isPending && !volumeSlider.isInteracting && (
                  <div className="flex justify-end mt-1">
                    <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs text-gray-500 px-2">
                <span>0%</span>
                <span>{Math.round(settings.volume * 100)}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Sound Selection - Mobile Optimized */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Sound</Label>
              <Select
                value={settings.sound}
                onValueChange={(value: MetronomeSettings['sound']) => 
                  handleSettingsUpdate({ sound: value })
                }
              >
                <SelectTrigger className="h-12 touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="click">Click</SelectItem>
                  <SelectItem value="beep">Beep</SelectItem>
                  <SelectItem value="wood">Wood</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Signature - Mobile Optimized */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Time Signature</Label>
              <Select
                value={settings.timeSignature.toString()}
                onValueChange={(value) => 
                  handleSettingsUpdate({ timeSignature: parseInt(value) })
                }
              >
                <SelectTrigger className="h-12 touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2/4</SelectItem>
                  <SelectItem value="3">3/4</SelectItem>
                  <SelectItem value="4">4/4</SelectItem>
                  <SelectItem value="6">6/8</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Accent - Mobile Optimized */}
            <div className="flex items-center justify-between py-2">
              <Label className="text-base font-medium">Accent First Beat</Label>
              <Button
                variant={settings.accent ? "default" : "outline"}
                size="sm"
                onClick={() => handleSettingsUpdate({ accent: !settings.accent })}
                className="h-10 min-w-[60px] touch-manipulation"
              >
                {settings.accent ? "On" : "Off"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
