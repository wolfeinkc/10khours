'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
// import { Button } from '@/components/ui/button' // Unused
import { Card, CardContent } from '@/components/ui/card'
import { GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Database } from '@/lib/supabase'
import DraggableSongCard from '@/components/DraggableSongCard'
import DraggableFolderCard from '@/components/DraggableFolderCard'

type Song = Database['public']['Tables']['songs']['Row']
type Folder = Database['public']['Tables']['folders']['Row']

interface DragDropLibraryProps {
  songs: Song[]
  folders: Folder[]
  onSongUpdated: (song: Song) => void
  onSongDeleted: (songId: string) => void
  onFolderDeleted: (folderId: string) => void
  onEdit: (song: Song) => void
  onStartPractice: (song: Song) => void
  practiceTimes?: Record<string, number>
}

export default function DragDropLibrary({
  songs,
  folders,
  onSongUpdated,
  onSongDeleted,
  onFolderDeleted,
  onEdit,
  onStartPractice,
  practiceTimes = {},
}: DragDropLibraryProps) {
  const { user } = useAuth()
  const supabase = createClient()
  
  // Always in rearrange mode now - simplified
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localSongs, setLocalSongs] = useState(songs)
  const [localFolders, setLocalFolders] = useState(folders)

  // Enhanced sensors for both desktop and mobile interaction
  const sensors = useSensors(
    // Mouse sensor for desktop
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // Touch sensor specifically for mobile devices
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,    // Longer delay to prevent accidental drags
        tolerance: 5,  // Allow slight movement before canceling
      },
    }),
    // Fallback pointer sensor
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Update local state when props change
  useState(() => {
    setLocalSongs(songs)
    setLocalFolders(folders)
  })

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Handle moving songs between folders or reordering
    const activeSong = localSongs.find(song => song.id === activeId)
    const overSong = localSongs.find(song => song.id === overId)
    const overFolder = localFolders.find(folder => folder.id === overId)

    if (activeSong) {
      if (overFolder) {
        // Moving song to folder
        setLocalSongs(prev => prev.map(song => 
          song.id === activeId 
            ? { ...song, folder_id: overFolder.id }
            : song
        ))
      } else if (overSong) {
        // Reordering songs
        const activeIndex = localSongs.findIndex(song => song.id === activeId)
        const overIndex = localSongs.findIndex(song => song.id === overId)
        
        if (activeIndex !== overIndex) {
          setLocalSongs(prev => arrayMove(prev, activeIndex, overIndex))
        }
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || !user) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    try {
      const activeSong = localSongs.find(song => song.id === activeId)
      const activeFolder = localFolders.find(folder => folder.id === activeId)

      if (activeSong) {
        // Update song position and folder
        const newPosition = localSongs.findIndex(song => song.id === activeId)
        const overFolder = localFolders.find(folder => folder.id === overId)
        
        const { data, error } = await supabase
          .from('songs')
          .update({
            position: newPosition,
            folder_id: overFolder ? overFolder.id : activeSong.folder_id
          })
          .eq('id', activeId)
          .select()
          .single()

        if (error) throw error
        onSongUpdated(data)
      } else if (activeFolder) {
        // Update folder position
        const activeIndex = localFolders.findIndex(folder => folder.id === activeId)
        const overIndex = localFolders.findIndex(folder => folder.id === overId)
        
        if (activeIndex !== overIndex) {
          const newFolders = arrayMove(localFolders, activeIndex, overIndex)
          setLocalFolders(newFolders)
          
          // Update positions in database
          const updates = newFolders.map((folder, index) => ({
            id: folder.id,
            position: index
          }))

          for (const update of updates) {
            await supabase
              .from('folders')
              .update({ position: update.position })
              .eq('id', update.id)
          }
        }
      }
    } catch (error) {
      console.error('Error updating positions:', error)
      // Revert local changes on error
      setLocalSongs(songs)
      setLocalFolders(folders)
    }
  }

  const getActiveItem = () => {
    if (!activeId) return null
    return localSongs.find(song => song.id === activeId) || 
           localFolders.find(folder => folder.id === activeId)
  }

  const unorganizedSongs = localSongs.filter(song => !song.folder_id)
  const organizedSongs = localSongs.filter(song => song.folder_id)

  return (
    <div className="space-y-6">
      {/* Enhanced Mobile-First Organize Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 sm:p-3">
          <div className="space-y-3 sm:space-y-2">
            <div className="flex items-center space-x-2 text-blue-800">
              <GripVertical className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="font-medium text-sm sm:text-xs">
                <span className="sm:hidden">Organize Mode Active</span>
                <span className="hidden sm:inline">Drag and Drop Mode</span>
              </span>
            </div>
            
            {/* Mobile-specific instructions */}
            <div className="text-blue-700 text-sm sm:text-xs space-y-1">
              <p className="sm:hidden">
                • <strong>Touch & hold</strong> the ⋮⋮ handle to grab items
              </p>
              <p className="sm:hidden">
                • <strong>Drag</strong> to reorder or move songs into folders
              </p>
              <p className="hidden sm:block">
                Drag and drop to reorganize your songs and folders. Drop songs onto folders to organize them.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Folders */}
        {localFolders.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Folders</h3>
            <SortableContext 
              items={localFolders.map(f => f.id)} 
              strategy={verticalListSortingStrategy}
            >
              {/* Mobile-first grid for folders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-3">
                {localFolders.map(folder => (
                  <DraggableFolderCard
                    key={folder.id}
                    folder={folder}
                    songs={organizedSongs.filter(song => song.folder_id === folder.id)}
                    isRearrangeMode={true}
                    onFolderDeleted={onFolderDeleted}
                    onSongUpdated={onSongUpdated}
                    onSongDeleted={onSongDeleted}
                    onStartPractice={onStartPractice}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        )}

        {/* Unorganized Songs */}
        {unorganizedSongs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Songs</h3>
            <SortableContext 
              items={unorganizedSongs.map(s => s.id)} 
              strategy={verticalListSortingStrategy}
            >
              {/* Mobile-first grid for songs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-3">
                {unorganizedSongs.map(song => (
                  <DraggableSongCard
                    key={song.id}
                    song={song}
                    isRearrangeMode={true}
                    onSongUpdated={onSongUpdated}
                    onSongDeleted={onSongDeleted}
                    onEdit={onEdit}
                    onStartPractice={onStartPractice}
                    totalTime={practiceTimes[song.id] || 0}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        )}

        {/* Enhanced mobile-friendly drag overlay */}
        <DragOverlay>
          {activeId ? (
            <div className="opacity-75 transform rotate-3 scale-105 transition-transform">
              {getActiveItem() && 'title' in getActiveItem()! ? (
                <div className="p-4 sm:p-3 bg-white border-2 border-blue-400 rounded-lg shadow-xl">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: (getActiveItem() as Song).color }}
                    />
                    <p className="font-medium text-sm">{(getActiveItem() as Song).title}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Moving song...</p>
                </div>
              ) : (
                <div className="p-4 sm:p-3 bg-white border-2 border-blue-400 rounded-lg shadow-xl">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: (getActiveItem() as Folder).color }}
                    />
                    <p className="font-medium text-sm">{(getActiveItem() as Folder).name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Moving folder...</p>
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
