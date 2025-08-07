'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Settings, Clock } from 'lucide-react'
import { Database } from '@/lib/supabase'
// import { createClient } from '@/lib/supabase' // Unused
// import { useAuth } from '@/components/AuthProvider' // Unused

type Song = Database['public']['Tables']['songs']['Row']

interface SongCardProps {
  song: Song
  totalTime?: number
  isSelected?: boolean
  onSelect: (song: Song) => void
  onEdit: (song: Song) => void
  onStartPractice: (song: Song) => void
  isRearrangeMode?: boolean
  onDragStart?: (e: React.DragEvent, song: Song) => void
  onDragOver?: (e: React.DragEvent, song: Song) => void
  onDrop?: (e: React.DragEvent, song: Song) => void
}

export default function SongCard({ 
  song, 
  totalTime = 0, 
  isSelected = false,
  onSelect,
  onEdit,
  onStartPractice,
  isRearrangeMode = false,
  onDragStart,
  onDragOver,
  onDrop
}: SongCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [practiceTime, setPracticeTime] = useState(totalTime)

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (totalTime !== undefined) {
      setPracticeTime(totalTime)
    }
  }, [totalTime])

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger practice if clicking on settings button or if in rearrange mode
    const target = e.target as HTMLElement
    if (!isRearrangeMode && !target.closest('.settings-button')) {
      onSelect(song)
    }
  }

  const handleStartPractice = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLoading(true)
    onStartPractice(song)
    setTimeout(() => setIsLoading(false), 500)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(song)
  }

  return (
    <Card 
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98]
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
        ${isRearrangeMode ? 'cursor-move' : ''}
        min-h-[120px] sm:min-h-[100px] // Touch-friendly minimum height
      `}
      onClick={handleClick}
      draggable={isRearrangeMode}
      onDragStart={onDragStart ? (e) => onDragStart(e, song) : undefined}
      onDragOver={onDragOver ? (e) => onDragOver(e, song) : undefined}
      onDrop={onDrop ? (e) => onDrop(e, song) : undefined}
    >
      <CardHeader className="pb-3 sm:pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Mobile-optimized drag handle */}
            {isRearrangeMode && (
              <div className="flex flex-col space-y-1 cursor-move mt-1 p-2 -ml-2 touch-manipulation">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
            )}
            
            {/* Larger color indicator for mobile */}
            <div 
              className="w-5 h-5 sm:w-4 sm:h-4 rounded-full flex-shrink-0 border border-gray-200 mt-1"
              style={{ backgroundColor: song.color }}
            />
            
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-base font-semibold leading-tight">{song.title}</CardTitle>
              {song.artist && (
                <p className="text-sm text-gray-600 truncate mt-1">{song.artist}</p>
              )}
            </div>
          </div>
          
          {/* Touch-friendly settings button */}
          {!isRearrangeMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              title="Song Settings"
              className="settings-button h-10 w-10 sm:h-8 sm:w-8 p-0 flex-shrink-0" // Touch-friendly size
            >
              <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3 sm:space-y-2">
        {/* Mobile-optimized info display */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span className="font-medium">{formatTime(practiceTime)}</span>
          </div>
          
          {song.metronome_bpm && (
            <div className="text-gray-600 font-medium">
              {song.metronome_bpm} BPM
            </div>
          )}
        </div>
        
        {/* Mobile-friendly notes preview */}
        {song.notes && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-2">
            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
              {song.notes.substring(0, 120)}
              {song.notes.length > 120 && '...'}
            </p>
          </div>
        )}
        
        {/* Touch-friendly action button */}
        {!isRearrangeMode && (
          <Button 
            onClick={handleStartPractice}
            className="w-full h-11 sm:h-9 text-base sm:text-sm font-medium" // Touch-friendly height
            disabled={isLoading}
          >
            <Play className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
            {isLoading ? 'Starting...' : 'Start Practice'}
          </Button>
        )}
        
        {/* Rearrange mode message */}
        {isRearrangeMode && (
          <div className="text-center py-2 text-sm text-gray-500 bg-blue-50 rounded-lg">
            <span className="sm:hidden">Drag the handle to move this song</span>
            <span className="hidden sm:inline">Drag to reorder</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}