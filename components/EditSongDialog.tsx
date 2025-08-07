'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Database } from '@/lib/supabase'

type Song = Database['public']['Tables']['songs']['Row']
type Folder = Database['public']['Tables']['folders']['Row']

interface EditSongDialogProps {
  isOpen: boolean
  onClose: () => void
  onSongUpdated: (song: Song) => void
  song: Song | null
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

export default function EditSongDialog({ 
  isOpen, 
  onClose, 
  onSongUpdated, 
  song,
  folders 
}: EditSongDialogProps) {
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
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Initialize form with song data
  useEffect(() => {
    if (song) {
      setTitle(song.title)
      setFolderId(song.folder_id)
      
      // Handle color - check if it's a custom color
      if (songColors.includes(song.color)) {
        setColor(song.color)
        setUseCustomColor(false)
      } else {
        setCustomColor(song.color)
        setUseCustomColor(true)
      }
      
      setBpm(song.metronome_bpm || 120)
      setNotes(song.notes || '')
      
      // Set default metronome settings (these could be stored in song later)
      setMetronomeSound('click')
      setTimeSignature(4)
      setAccentFirstBeat(true)
    }
  }, [song])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !song || !title.trim()) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const finalColor = useCustomColor ? customColor : color
      
      const { data: updatedSong, error: updateError } = await supabase
        .from('songs')
        .update({
          title: title.trim(),
          folder_id: folderId,
          color: finalColor,
          metronome_bpm: bpm,
          notes: notes.trim() || null
        })
        .eq('id', song.id)
        .select()
        .single()
      
      if (updateError) {
        throw updateError
      }
      
      onSongUpdated(updatedSong)
      onClose()
    } catch (err: unknown) {
      console.error('Error updating song:', err)
      setError(err instanceof Error ? err.message : 'Failed to update song')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!song) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit Song</DialogTitle>
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
              className="h-12 text-base"
            />
          </div>
          

          
          {folders.length > 0 && (
            <div>
              <Label htmlFor="folder" className="text-sm font-medium mb-2 block">Folder</Label>
              <Select value={folderId || 'none'} onValueChange={(value) => setFolderId(value === 'none' ? null : value)}>
                <SelectTrigger className="h-12 text-base">
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
          
          <div>
            <Label>Color</Label>
            <div className="space-y-3 mt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={useCustomColor}
                  onCheckedChange={setUseCustomColor}
                  disabled={isSubmitting}
                />
                <Label className="text-sm">Use custom color</Label>
              </div>
              
              {useCustomColor ? (
                <div>
                  <Input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    disabled={isSubmitting}
                    className="w-20 h-10"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {songColors.map((songColor) => (
                    <button
                      key={songColor}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        color === songColor ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: songColor }}
                      onClick={() => setColor(songColor)}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <Label className="text-base font-medium">Metronome Settings</Label>
            
            <div>
              <Label htmlFor="bpm">BPM: {bpm}</Label>
              <Slider
                value={[bpm]}
                onValueChange={(value) => setBpm(value[0])}
                min={40}
                max={200}
                step={1}
                className="mt-2"
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>40</span>
                <span>200</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="sound">Sound</Label>
              <Select value={metronomeSound} onValueChange={setMetronomeSound}>
                <SelectTrigger>
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
            
            <div>
              <Label htmlFor="timeSignature">Time Signature</Label>
              <Select value={timeSignature.toString()} onValueChange={(value) => setTimeSignature(parseInt(value))}>
                <SelectTrigger>
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
            
            <div className="flex items-center justify-between">
              <Label htmlFor="accent">Accent First Beat</Label>
              <Switch
                checked={accentFirstBeat}
                onCheckedChange={setAccentFirstBeat}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes" className="text-sm font-medium mb-2 block">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this song..."
              className="min-h-[120px] text-base resize-none" // Touch-friendly height and font
              disabled={isSubmitting}
            />
          </div>
          

          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="h-12 text-base font-medium sm:h-10 sm:text-sm order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !title.trim()}
              className="h-12 text-base font-medium sm:h-10 sm:text-sm order-1 sm:order-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
