'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Database } from '@/lib/supabase'

type Folder = Database['public']['Tables']['folders']['Row']

interface CreateFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onFolderCreated: (folder: Folder) => void
}

const defaultFolderColor = '#3B82F6' // Blue

export default function CreateFolderDialog({ 
  isOpen, 
  onClose, 
  onFolderCreated 
}: CreateFolderDialogProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      // Get the next position for the folder
      const { data: existingFolders } = await supabase
        .from('folders')
        .select('position')
        .eq('user_id', user.id)
        .order('position', { ascending: false })
        .limit(1)
      
      const nextPosition = existingFolders && existingFolders.length > 0 
        ? existingFolders[0].position + 1 
        : 0
      
      const { data: newFolder, error: insertError } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name: name.trim(),
          color: defaultFolderColor,
          position: nextPosition
        })
        .select()
        .single()
      
      if (insertError) {
        throw insertError
      }
      
      onFolderCreated(newFolder)
      
      // Reset form
      setName('')
      onClose()
    } catch (err: unknown) {
      console.error('Error creating folder:', err)
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create New Folder</DialogTitle>
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
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}