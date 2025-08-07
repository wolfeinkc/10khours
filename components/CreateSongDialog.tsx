'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Database } from '@/lib/supabase'

type Song = Database['public']['Tables']['songs']['Row']
type Folder = Database['public']['Tables']['folders']['Row']

interface CreateSongDialogProps {
  isOpen: boolean
  onClose: () => void
  onSongCreated: (song: Song) => void
  folders: Folder[]
}

const songColors = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
]

export default function CreateSongDialog({ 
  isOpen, 
  onClose, 
  onSongCreated, 
  folders 
}: CreateSongDialogProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [color, setColor] = useState(songColors[0])
  const [customColor, setCustomColor] = useState('#000000')
  const [useCustomColor, setUseCustomColor] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [metronomeSound, setMetronomeSound] = useState('click')
  const [timeSignature, setTimeSignature] = useState(4)
  const [accentFirstBeat, setAccentFirstBeat] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      // Get the next position for the song
      const { data: existingSongs } = await supabase
        .from('songs')
        .select('position')
        .eq('user_id', user.id)
        .order('position', { ascending: false })
        .limit(1)
      
      const nextPosition = existingSongs && existingSongs.length > 0 
        ? existingSongs[0].position + 1 
        : 0
      
      const { data: newSong, error: insertError } = await supabase
        .from('songs')
        .insert({
          user_id: user.id,
          title: title.trim(),
          folder_id: folderId,
          color: useCustomColor ? customColor : color,
          metronome_bpm: bpm,
          position: nextPosition
        })
        .select()
        .single()
      
      if (insertError) {
        throw insertError
      }
      
      onSongCreated(newSong)
      
      // Reset form
      setTitle('')
      setFolderId(null)
      setColor(songColors[0])
      setCustomColor('#000000')
      setUseCustomColor(false)
      setBpm(120)
      setMetronomeSound('click')
      setTimeSignature(4)
      setAccentFirstBeat(true)
      onClose()
    } catch (err: unknown) {
      console.error('Error creating song:', err)
      setError(err instanceof Error ? err.message : 'Failed to create song')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Add New Song</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-4">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          
          <div>
            <Label htmlFor="title" className="text-sm font-medium mb-2 block">Song Title</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter song title"
              required
              disabled={isSubmitting}
              className="h-12 text-base" // Touch-friendly height and font size
            />
          </div>
          

          
          {folders.length > 0 && (
            <div>
              <Label htmlFor="folder" className="text-sm font-medium mb-2 block">Folder (Optional)</Label>
              <Select value={folderId || 'none'} onValueChange={(value) => setFolderId(value === 'none' ? null : value)}>
                <SelectTrigger className="h-12 text-base"> {/* Touch-friendly height */}
                  <SelectValue placeholder="Choose a folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="h-11 text-base">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id} className="h-11 text-base">
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Metronome Settings */}
          <div className="space-y-5 sm:space-y-4">
            <Label className="text-base font-medium block">Metronome Settings</Label>
            
            <div>
              <Label htmlFor="bpm" className="text-sm font-medium mb-3 block">BPM: {bpm}</Label>
              <Slider
                min={40}
                max={200}
                step={1}
                value={[bpm]}
                onValueChange={(value) => setBpm(value[0])}
                className="mt-2 h-6" // Larger slider for touch
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>40</span>
                <span>200</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="sound" className="text-sm font-medium mb-2 block">Sound</Label>
              <Select value={metronomeSound} onValueChange={setMetronomeSound}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="click" className="h-11 text-base">Click</SelectItem>
                  <SelectItem value="beep" className="h-11 text-base">Beep</SelectItem>
                  <SelectItem value="wood" className="h-11 text-base">Wood</SelectItem>
                  <SelectItem value="digital" className="h-11 text-base">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="timeSignature" className="text-sm font-medium mb-2 block">Time Signature</Label>
              <Select value={timeSignature.toString()} onValueChange={(value) => setTimeSignature(parseInt(value))}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2" className="h-11 text-base">2/4</SelectItem>
                  <SelectItem value="3" className="h-11 text-base">3/4</SelectItem>
                  <SelectItem value="4" className="h-11 text-base">4/4</SelectItem>
                  <SelectItem value="6" className="h-11 text-base">6/8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="accent" className="text-sm font-medium">Accent first beat</Label>
              <Switch
                id="accent"
                checked={accentFirstBeat}
                onCheckedChange={setAccentFirstBeat}
                disabled={isSubmitting}
                className="data-[state=checked]:bg-blue-600" // Better visual feedback
              />
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-3 block">Color</Label>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {songColors.map((songColor) => (
                  <button
                    key={songColor}
                    type="button"
                    className={`w-11 h-11 rounded-full border-3 transition-all ${
                      !useCustomColor && color === songColor 
                        ? 'border-gray-800 scale-110' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`} // Larger touch targets with better feedback
                    style={{ backgroundColor: songColor }}
                    onClick={() => {
                      setColor(songColor)
                      setUseCustomColor(false)
                    }}
                    disabled={isSubmitting}
                    aria-label={`Select color ${songColor}`}
                  />
                ))}
              </div>
              
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="useCustomColor" className="text-sm font-medium">Use custom color</Label>
                <Switch
                  id="useCustomColor"
                  checked={useCustomColor}
                  onCheckedChange={setUseCustomColor}
                  disabled={isSubmitting}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
              
              {useCustomColor && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer" // Larger color picker
                    disabled={isSubmitting}
                    aria-label="Custom color picker"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">Custom Color</span>
                    <div className="text-xs text-gray-500">{customColor}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="h-12 text-base font-medium sm:h-10 sm:text-sm order-2 sm:order-1" // Touch-friendly on mobile
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !title.trim()}
              className="h-12 text-base font-medium sm:h-10 sm:text-sm order-1 sm:order-2" // Primary action first on mobile
            >
              {isSubmitting ? 'Creating...' : 'Add Song'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}