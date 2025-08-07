'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Edit, Save, X, StickyNote } from 'lucide-react'
import { Database } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

type Song = Database['public']['Tables']['songs']['Row']

interface NotesEditorProps {
  song: Song
  onSongUpdated: (song: Song) => void
}

export default function NotesEditor({ song, onSongUpdated }: NotesEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [originalContent, setOriginalContent] = useState('')

  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (song) {
      const content = song.notes || ''
      setNoteContent(content)
      setOriginalContent(content)
      setIsEditing(false)
    }
  }, [song])

  const handleEdit = () => {
    setIsEditing(true)
    setOriginalContent(noteContent)
  }

  const handleCancel = () => {
    setNoteContent(originalContent)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!user || !song) return

    setIsSaving(true)

    try {
      const { data, error } = await supabase
        .from('songs')
        .update({ notes: noteContent.trim() || null })
        .eq('id', song.id)
        .select()
        .single()

      if (error) throw error

      onSongUpdated(data)
      setOriginalContent(noteContent)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <StickyNote className="h-5 w-5" />
            <span>Notes</span>
          </CardTitle>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!isEditing ? (
          <div className="space-y-4">
            {song.notes ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {song.notes}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <StickyNote className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-4">No notes yet for this song.</p>
                <Button onClick={handleEdit} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add your practice notes, techniques, or reminders for this song..."
              className="min-h-[200px] resize-y"
              autoFocus
            />
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+Enter</kbd> to save, 
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Escape</kbd> to cancel
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || (noteContent.trim() === originalContent.trim())}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}