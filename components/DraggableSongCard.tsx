'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Edit, 
  Trash2, 
  GripVertical, 
  Music, 
  Clock,
  Timer
} from 'lucide-react'
import { Database } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useState } from 'react'

type Song = Database['public']['Tables']['songs']['Row']

interface DraggableSongCardProps {
  song: Song
  isRearrangeMode: boolean
  onSongUpdated: (song: Song) => void
  onSongDeleted: (songId: string) => void
  onEdit: (song: Song) => void
  onStartPractice: (song: Song) => void
  totalTime?: number
}

export default function DraggableSongCard({
  song,
  isRearrangeMode,
  onSongUpdated: _onSongUpdated,
  onSongDeleted,
  onEdit,
  onStartPractice,
  totalTime = 0
}: DraggableSongCardProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: song.id,
    disabled: !isRearrangeMode,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleDelete = async () => {
    if (!user || isDeleting) return
    
    if (!confirm(`Are you sure you want to delete "${song.title}"?`)) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', song.id)

      if (error) throw error
      onSongDeleted(song.id)
    } catch (error) {
      console.error('Error deleting song:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        // Prevent text selection during drag on mobile
        WebkitUserSelect: isRearrangeMode ? 'none' : 'auto',
        userSelect: isRearrangeMode ? 'none' : 'auto'
      }}
      className={`group transition-all duration-200 hover:shadow-md ${
        isDragging ? 'shadow-lg ring-2 ring-blue-300 scale-105' : ''
      } ${isRearrangeMode ? 'touch-manipulation' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {isRearrangeMode && (
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded touch-manipulation select-none"
                style={{
                  touchAction: 'none', // Prevent scrolling when touching the handle
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
                onTouchStart={(e) => {
                  // Prevent page scroll when starting drag on mobile
                  e.preventDefault()
                }}
              >
                <GripVertical className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400" />
              </div>
            )}
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: song.color || '#3B82F6' }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{song.title}</h3>
              {song.artist && (
                <p className="text-sm text-gray-600 truncate">{song.artist}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {totalTime > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(totalTime)}</span>
              </div>
            )}
            {song.metronome_bpm && (
              <div className="flex items-center space-x-1">
                <Timer className="h-3 w-3" />
                <span>{song.metronome_bpm} BPM</span>
              </div>
            )}
          </div>
        </div>

        {song.notes && (
          <div className="mb-3">
            <Badge variant="outline" className="text-xs">
              <Music className="h-3 w-3 mr-1" />
              Has Notes
            </Badge>
          </div>
        )}

        {!isRearrangeMode && (
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              onClick={() => onStartPractice(song)}
              className="flex-1 mr-2"
            >
              <Play className="h-4 w-4 mr-2" />
              Practice
            </Button>
            
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(song)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {isRearrangeMode && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              <span className="sm:hidden">Touch & hold ⋮⋮ to move</span>
              <span className="hidden sm:inline">Drag to reorder or drop on folder</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
