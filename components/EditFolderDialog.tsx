'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Database } from '@/lib/supabase'

type Folder = Database['public']['Tables']['folders']['Row']

interface EditFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onFolderUpdated: (folder: Folder) => void
  folder: Folder | null
}

const folderColors = [
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

export default function EditFolderDialog({ 
  isOpen, 
  onClose, 
  onFolderUpdated,
  folder
}: EditFolderDialogProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState(folderColors[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (folder) {
      setName(folder.name)
      setColor(folder.color)
    }
  }, [folder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !folder || !name.trim()) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const { data: updatedFolder, error: updateError } = await supabase
        .from('folders')
        .update({
          name: name.trim(),
          color
        })
        .eq('id', folder.id)
        .select()
        .single()
      
      if (updateError) {
        throw updateError
      }
      
      onFolderUpdated(updatedFolder)
      onClose()
    } catch (err: unknown) {
      console.error('Error updating folder:', err)
      setError(err instanceof Error ? err.message : 'Failed to update folder')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-4">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          
          <div>
            <Label htmlFor="name" className="text-sm font-medium mb-2 block">Folder Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              required
              disabled={isSubmitting}
              className="h-12 text-base"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-3 block">Color</Label>
            <div className="flex flex-wrap gap-3">
              {folderColors.map((folderColor) => (
                <button
                  key={folderColor}
                  type="button"
                  className={`w-11 h-11 rounded-full border-3 transition-all ${
                    color === folderColor 
                      ? 'border-gray-800 scale-110' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: folderColor }}
                  onClick={() => setColor(folderColor)}
                  disabled={isSubmitting}
                  aria-label={`Select color ${folderColor}`}
                />
              ))}
            </div>
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
              disabled={isSubmitting || !name.trim()}
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
