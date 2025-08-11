'use client'

import { useState, useEffect } from 'react'
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
  useEffect(() => {
    setLocalSongs(songs)
    setLocalFolders(folders)
  }, [songs, folders])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return
    
    // Don't update state during drag over - this interferes with drag operations
    // All state updates will happen in handleDragEnd
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || !user) {
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) {
      return
    }
    
    try {
      const activeSong = localSongs.find(song => song.id === activeId)
      const activeFolder = localFolders.find(folder => folder.id === activeId)
      const overSong = localSongs.find(song => song.id === overId)
      const overFolder = localFolders.find(folder => folder.id === overId)

      if (activeSong && overSong && activeSong.id !== overSong.id) {
        console.log('Reordering songs:', activeSong.title, 'over', overSong.title)
        
        // Get the current order of songs in the same context (folder or main list)
        const contextSongs = localSongs.filter(song => 
          song.folder_id === activeSong.folder_id
        ).sort((a, b) => a.position - b.position)
        
        const activeIndex = contextSongs.findIndex(song => song.id === activeId)
        const overIndex = contextSongs.findIndex(song => song.id === overId)
        
        console.log('Reorder indices:', { activeIndex, overIndex })
        
        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          // Reorder the songs array
          const reorderedSongs = arrayMove(contextSongs, activeIndex, overIndex)
          
          // Update positions in database
          console.log('Updating song positions in database...')
          for (let i = 0; i < reorderedSongs.length; i++) {
            const song = reorderedSongs[i]
            const { error } = await supabase
              .from('songs')
              .update({ position: i })
              .eq('id', song.id)
            
            if (error) {
              console.error('Error updating song position:', error)
              throw error
            }
            console.log(`Updated ${song.title} to position ${i}`)
          }
          
          console.log('Successfully updated all song positions!')
          
          // Update local state with new order
          const updatedLocalSongs = localSongs.map(song => {
            const reorderedSong = reorderedSongs.find(rs => rs.id === song.id)
            if (reorderedSong) {
              return { ...song, position: reorderedSongs.indexOf(reorderedSong) }
            }
            return song
          })
          
          setLocalSongs(updatedLocalSongs)
          
          // Notify parent components
          reorderedSongs.forEach(song => {
            onSongUpdated({ ...song, position: reorderedSongs.indexOf(song) })
          })
        }
      } else if (activeSong && overFolder) {
        console.log('Moving song to folder:', activeSong.title, 'to', overFolder.name)
        
        // Move song to folder
        const { data, error } = await supabase
          .from('songs')
          .update({ folder_id: overFolder.id })
          .eq('id', activeId)
          .select()
          .single()

        if (error) throw error
        
        setLocalSongs(prev => prev.map(song => 
          song.id === activeId ? data : song
        ))
        onSongUpdated(data)
        
        console.log('Successfully moved song to folder!')
      } else if (activeFolder && overFolder && activeFolder.id !== overFolder.id) {
        console.log('Reordering folders:', activeFolder.name, 'over', overFolder.name)
        
        const activeIndex = localFolders.findIndex(folder => folder.id === activeId)
        const overIndex = localFolders.findIndex(folder => folder.id === overId)
        
        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          const reorderedFolders = arrayMove(localFolders, activeIndex, overIndex)
          
          // Update positions in database
          console.log('Updating folder positions in database...')
          for (let i = 0; i < reorderedFolders.length; i++) {
            const folder = reorderedFolders[i]
            const { error } = await supabase
              .from('folders')
              .update({ position: i })
              .eq('id', folder.id)
            
            if (error) {
              console.error('Error updating folder position:', error)
              throw error
            }
            console.log(`Updated ${folder.name} to position ${i}`)
          }
          
          setLocalFolders(reorderedFolders)
          console.log('Successfully updated all folder positions!')
        }
      } else {
        console.log('No valid reorder operation detected')
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
              <p className="sm:hidden">
                • <strong>Click</strong> the Done button to save your changes
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
