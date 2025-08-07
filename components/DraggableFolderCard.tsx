'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Folder, 
  FolderOpen,
  Edit, 
  Trash2, 
  GripVertical,
  ChevronDown,
  ChevronRight,
  Music,
  Clock
} from 'lucide-react'
import { Database } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import DraggableSongCard from '@/components/DraggableSongCard'

type Song = Database['public']['Tables']['songs']['Row']
type Folder = Database['public']['Tables']['folders']['Row']

interface DraggableFolderCardProps {
  folder: Folder
  songs: Song[]
  isRearrangeMode: boolean
  onFolderDeleted: (folderId: string) => void
  onSongUpdated: (song: Song) => void
  onSongDeleted: (songId: string) => void
  onStartPractice: (song: Song) => void
}

export default function DraggableFolderCard({
  folder,
  songs,
  isRearrangeMode,
  onFolderDeleted,
  onSongUpdated,
  onSongDeleted,
  onStartPractice
}: DraggableFolderCardProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: folder.id,
    disabled: !isRearrangeMode,
  })

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: folder.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleDelete = async () => {
    if (!user || isDeleting) return
    
    if (songs.length > 0) {
      alert(`Cannot delete folder "${folder.name}" because it contains ${songs.length} song(s). Move or delete the songs first.`)
      return
    }

    if (!confirm(`Are you sure you want to delete the folder "${folder.name}"?`)) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folder.id)

      if (error) throw error
      onFolderDeleted(folder.id)
    } catch (error) {
      console.error('Error deleting folder:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPracticeTime = songs.reduce((total, song) => {
    // This would need to be calculated from practice_sessions
    // For now, return 0 as placeholder
    return total + 0
  }, 0)

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
      ref={(node) => {
        setSortableNodeRef(node)
        setDroppableNodeRef(node)
      }}
      style={{
        ...style,
        // Prevent text selection during drag on mobile
        WebkitUserSelect: isRearrangeMode ? 'none' : 'auto',
        userSelect: isRearrangeMode ? 'none' : 'auto'
      }}
      className={`group transition-all duration-200 hover:shadow-md ${
        isDragging ? 'shadow-lg ring-2 ring-blue-300 scale-105' : ''
      } ${isOver ? 'ring-2 ring-green-300 bg-green-50' : ''} ${
        isRearrangeMode ? 'touch-manipulation' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
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
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 h-auto"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: folder.color || '#8B5CF6' }}
            />
            
            <CardTitle className="flex items-center space-x-2 text-base">
              {isExpanded ? (
                <FolderOpen className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
              <span className="truncate">{folder.name}</span>
            </CardTitle>
          </div>

          {!isRearrangeMode && (
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* TODO: Open edit dialog */}}
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
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500 ml-8">
          <div className="flex items-center space-x-1">
            <Music className="h-3 w-3" />
            <span>{songs.length} song{songs.length !== 1 ? 's' : ''}</span>
          </div>
          {totalPracticeTime > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(totalPracticeTime)}</span>
            </div>
          )}
        </div>

        {isRearrangeMode && isOver && (
          <div className="mt-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <span className="sm:hidden">Release to add song</span>
              <span className="hidden sm:inline">Drop song here to add to folder</span>
            </Badge>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {songs.length > 0 ? (
            <div className="space-y-3">
              {songs.map(song => (
                <DraggableSongCard
                  key={song.id}
                  song={song}
                  isRearrangeMode={isRearrangeMode}
                  onEdit={onSongUpdated}
                  onSongUpdated={onSongUpdated}
                  onSongDeleted={onSongDeleted}
                  onStartPractice={onStartPractice}
                  totalTime={0} // TODO: Calculate from practice sessions
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Music className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No songs in this folder yet</p>
              {isRearrangeMode && (
                <p className="text-xs mt-1">Drag songs here to organize them</p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
