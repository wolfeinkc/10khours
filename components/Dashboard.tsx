'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
// import { Badge } from '@/components/ui/badge' // Unused
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Folder, Music, Settings, LogOut, BarChart3, Target, Move, Grid3X3, ChevronDown } from 'lucide-react'
import { Database } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import DragDropLibrary from '@/components/DragDropLibrary'
import PracticeTimer from '@/components/PracticeTimer'
import CreateSongDialog from '@/components/CreateSongDialog'
import CreateFolderDialog from '@/components/CreateFolderDialog'
import EditSongDialog from '@/components/EditSongDialog'
import EditFolderDialog from '@/components/EditFolderDialog'
import PracticeAnalytics from '@/components/PracticeAnalytics'
import GoalSetting from '@/components/GoalSetting'
import SettingsModal from '@/components/SettingsModal'
import ErrorBoundary from '@/components/ErrorBoundary'
import MobilePracticeTimer from '@/components/MobilePracticeTimer'
import DayStreakAchievement from '@/components/DayStreakAchievement'
// import LoadingSkeleton from '@/components/LoadingSkeleton' // Unused
import { FullPageLoader } from '@/components/LoadingSpinner'
import SongCard from '@/components/SongCard'

import { useAppKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

type Song = Database['public']['Tables']['songs']['Row']
type Folder = Database['public']['Tables']['folders']['Row']

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const [songs, setSongs] = useState<Song[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateSong, setShowCreateSong] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [editingSong, setEditingSong] = useState<Song | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [viewMode, setViewMode] = useState<'standard' | 'dragdrop'>('standard')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [practiceTimes, setPracticeTimes] = useState<Record<string, number>>({})
  
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('position')

      if (foldersError) throw foldersError

      const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', user.id)
        .order('position')

      if (songsError) throw songsError

      setFolders(folders || [])
      setSongs(songs || [])
      
      // Fetch practice sessions for time calculation
      const { data: sessions, error: sessionsError } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', user.id)
      
      if (!sessionsError && sessions) {
        const timeMap: Record<string, number> = {}
        sessions.forEach(session => {
          if (timeMap[session.song_id]) {
            timeMap[session.song_id] += session.duration_minutes
          } else {
            timeMap[session.song_id] = session.duration_minutes
          }
        })
        setPracticeTimes(timeMap)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Note: Window event listeners removed - now using callback-based UI updates
  // from PracticeTimer components to avoid page refreshes

  const handleSongCreated = useCallback((newSong: Song) => {
    setSongs(prev => [...prev, newSong])
  }, [])

  const handleFolderCreated = useCallback((newFolder: Folder) => {
    setFolders(prev => [...prev, newFolder])
  }, [])

  const handleFolderUpdated = useCallback((updatedFolder: Folder) => {
    setFolders(prev => prev.map(folder => 
      folder.id === updatedFolder.id ? updatedFolder : folder
    ))
  }, [])

  const handleSongUpdated = useCallback((updatedSong: Song) => {
    setSongs(prev => {
      const updated = prev.map(song => 
        song.id === updatedSong.id ? updatedSong : song
      )
      // Sort by position to maintain correct order after updates
      return updated.sort((a, b) => a.position - b.position)
    })
    
    // Update selected song if it's the same song being edited
    if (selectedSong?.id === updatedSong.id) {
      setSelectedSong(updatedSong)
    }
  }, [selectedSong?.id])

  const handleSongDeleted = useCallback((songId: string) => {
    setSongs(prev => prev.filter(song => song.id !== songId))
    if (selectedSong?.id === songId) {
      setSelectedSong(null)
    }
  }, [selectedSong?.id])

  const handleFolderDeleted = useCallback((folderId: string) => {
    setFolders(prev => prev.filter(folder => folder.id !== folderId))
    // Move songs from deleted folder to unorganized
    setSongs(prev => prev.map(song => 
      song.folder_id === folderId ? { ...song, folder_id: null } : song
    ))
  }, [])

  const handleStartPractice = useCallback((song: Song) => {
    // Auto-scroll to top when switching songs
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    setSelectedSong(song)
  }, [])

  // Handle song updates from practice timer (notes, BPM, etc.)
  const handlePracticeTimerSongUpdate = useCallback((updatedFields: Partial<Song>) => {
    // Use functional updates to avoid dependency on selectedSong
    setSongs(prev => prev.map(song => {
      if (song.id === selectedSong?.id) {
        const updatedSong = { ...song, ...updatedFields }
        // Also update the selected song if it matches
        setSelectedSong(updatedSong)
        return updatedSong
      }
      return song
    }))
  }, [selectedSong?.id]) // Only depend on the ID, not the entire song object

  // Handle practice completion (refresh practice times)
  const handlePracticeCompleted = useCallback(async () => {
    if (!user) return
    
    try {
      // Refresh practice times after a session is completed
      const { data: sessions, error: sessionsError } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', user.id)
      
      if (!sessionsError && sessions) {
        const timeMap: Record<string, number> = {}
        sessions.forEach(session => {
          if (timeMap[session.song_id]) {
            timeMap[session.song_id] += session.duration_minutes
          } else {
            timeMap[session.song_id] = session.duration_minutes
          }
        })
        setPracticeTimes(timeMap)
      }
    } catch (error) {
      console.error('Error refreshing practice times:', error)
    }
  }, [user, supabase])

  // Keyboard shortcuts - search functionality removed for mobile-first experience
  useAppKeyboardShortcuts({
    onNewSong: () => setShowCreateSong(true),
    onNewFolder: () => setShowCreateFolder(true),
    onOpenSettings: () => setShowSettings(true),
    onEscape: () => {
      setShowCreateSong(false)
      setShowCreateFolder(false)
      setShowSettings(false)
    }
  })

  const stopPractice = useCallback(() => {
    setSelectedSong(null)
    // Refresh data after practice session ends
    fetchData()
  }, [fetchData])

  const { unorganizedSongs, organizedSongs, folderSongCounts } = useMemo(() => {
    const unorganized = songs.filter(song => !song.folder_id)
    const organized = songs.filter(song => song.folder_id)
    const counts = folders.reduce((acc, folder) => {
      acc[folder.id] = organized.filter(song => song.folder_id === folder.id).length
      return acc
    }, {} as Record<string, number>)
    
    return {
      unorganizedSongs: unorganized,
      organizedSongs: organized,
      folderSongCounts: counts
    }
  }, [songs, folders])

  if (loading) {
    return <FullPageLoader text="Loading your practice data..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Mobile Header Layout */}
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left: App Title */}
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                10K Hours
              </h1>
              <div className="hidden sm:block">
                <DayStreakAchievement />
              </div>
            </div>
            
            {/* Right: User Info & Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile: Show streak achievement */}
              <div className="sm:hidden">
                <DayStreakAchievement />
              </div>
              
              {/* User Info - Hidden on small mobile */}
              <div className="hidden md:flex items-center space-x-3">
                <span className="text-sm text-gray-600 truncate max-w-32 lg:max-w-none">
                  {profile?.full_name || user?.email}
                </span>
                {profile?.user_type === 'teacher' && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs whitespace-nowrap">
                    Teacher
                  </span>
                )}
              </div>
              
              {/* Settings Button - Touch-friendly */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSettings(true)}
                className="h-11 px-3 sm:h-10 sm:px-4" // 44px minimum touch target
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              
              {/* Sign Out Button - Touch-friendly */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className="h-11 px-3 sm:h-10 sm:px-4" // 44px minimum touch target
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
          
          {/* Currently Practicing Banner - Mobile Optimized */}
          {selectedSong && (
            <div className="border-t bg-blue-50 px-4 py-2 sm:py-3">
              <div className="text-sm sm:text-base text-blue-800 text-center sm:text-left">
                <span className="font-medium">Currently practicing:</span>{' '}
                <span className="font-bold">{selectedSong.title}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedSong && (
          <ErrorBoundary>
            <div className="mb-8">
              <div className="block sm:hidden">
                <MobilePracticeTimer 
                  song={selectedSong} 
                  onStop={stopPractice} 
                  onEditSong={setEditingSong}
                  onSongUpdated={handlePracticeTimerSongUpdate}
                  onPracticeCompleted={handlePracticeCompleted}
                />
              </div>
              <div className="hidden sm:block">
                <PracticeTimer 
                  song={selectedSong} 
                  onStop={stopPractice} 
                  onEditSong={setEditingSong}
                  onSongUpdated={handlePracticeTimerSongUpdate}
                  onPracticeCompleted={handlePracticeCompleted}
                />
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* Mobile-First Tab Navigation */}
        <Tabs defaultValue="library" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12 sm:h-10 bg-gray-100 p-1">
            <TabsTrigger 
              value="library" 
              className="flex items-center justify-center space-x-1 sm:space-x-2 h-10 sm:h-8 text-sm sm:text-base font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Music className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Library</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="flex items-center justify-center space-x-1 sm:space-x-2 h-10 sm:h-8 text-sm sm:text-base font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <BarChart3 className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="goals" 
              className="flex items-center justify-center space-x-1 sm:space-x-2 h-10 sm:h-8 text-sm sm:text-base font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Target className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Goals</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            {/* Mobile-Optimized Library Header */}
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Your Music Library</h1>
              
              {/* Mobile-optimized header - search removed for cleaner UX */}
            </div>

            {/* Mobile-First Action Bar with Touch Interactions */}
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              {/* Enhanced Action Buttons with Touch Feedback */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Button 
                  onClick={() => setShowCreateFolder(true)} 
                  size="sm"
                  className="w-full sm:w-auto h-11 sm:h-10 justify-center sm:justify-start touch-manipulation active:scale-95 transition-transform" // Enhanced touch feedback
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="sm:hidden">Add Folder</span>
                  <span className="hidden sm:inline">New Folder</span>
                </Button>
                <Button 
                  onClick={() => setShowCreateSong(true)} 
                  size="sm"
                  className="w-full sm:w-auto h-11 sm:h-10 justify-center sm:justify-start touch-manipulation active:scale-95 transition-transform" // Enhanced touch feedback
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="sm:hidden">Add Song</span>
                  <span className="hidden sm:inline">New Song</span>
                </Button>
              </div>
            </div>

            <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (viewMode === 'dragdrop') {
                      // Refresh data when exiting organize mode to show new order
                      await fetchData()
                    }
                    setViewMode(viewMode === 'standard' ? 'dragdrop' : 'standard')
                  }}
                  className="w-full sm:w-auto h-11 sm:h-10 justify-center sm:justify-start touch-manipulation active:scale-95 transition-transform" // Enhanced touch feedback
                >
                  {viewMode === 'standard' ? (
                    <>
                      <Move className="h-4 w-4 mr-2" />
                      <span className="sm:hidden">Organize Library</span>
                      <span className="hidden sm:inline">Organize Songs & Folders</span>
                    </>
                  ) : (
                    <>
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      <span className="sm:hidden">Done</span>
                      <span className="hidden sm:inline">Done Organizing</span>
                    </>
                  )}
                </Button>

            {/* Conditional Rendering Based on View Mode */}
            {viewMode === 'standard' ? (
              <>
                {/* Standard View - Folders with Expand/Collapse */}
                {folders.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Folder className="h-5 w-5 mr-2" />
                      Folders
                    </h3>
                    <div className="space-y-4">
                      {folders.map(folder => {
                        const isExpanded = expandedFolders[folder.id] ?? false;
                        const folderSongs = organizedSongs.filter(song => song.folder_id === folder.id);
                        
                        return (
                          <div key={folder.id} className="border rounded-lg overflow-hidden">
                            <div 
                              className="flex items-center justify-between p-4 sm:p-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 min-h-[60px] touch-manipulation"
                              onClick={() => setExpandedFolders(prev => ({
                                ...prev,
                                [folder.id]: !isExpanded
                              }))}
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div 
                                  className="w-5 h-5 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: folder.color }}
                                />
                                <h4 className="font-medium text-gray-900 text-base sm:text-sm truncate">{folder.name}</h4>
                                <span className="text-sm text-gray-500 whitespace-nowrap">({folderSongCounts[folder.id] || 0})</span>
                              </div>
                              
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingFolder(folder)
                                  }}
                                  className="h-10 w-10 sm:h-8 sm:w-8 p-0" // Touch-friendly
                                >
                                  <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
                                </Button>
                                <ChevronDown className={`h-5 w-5 sm:h-4 sm:w-4 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`} />
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="border-t bg-gray-50 p-4 sm:p-3">
                                {/* Mobile-first folder songs grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                  {folderSongs.map(song => (
                                     <SongCard
                                       key={song.id}
                                       song={song}
                                       totalTime={practiceTimes[song.id] || 0}
                                       onSelect={handleStartPractice}
                                       onEdit={setEditingSong}
                                       onStartPractice={handleStartPractice}
                                     />
                                   ))}
                                </div>
                                {folderSongs.length === 0 && (
                                  <div className="text-center py-8 sm:py-4">
                                    <Music className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">
                                      No songs in this folder
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Standard View - Unorganized Songs */}
                {unorganizedSongs.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Music className="h-5 w-5 mr-2" />
                      Songs
                    </h3>
                    {/* Mobile-first responsive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-3">
                      {unorganizedSongs.map(song => (
                        <SongCard
                          key={song.id}
                          song={song}
                          totalTime={practiceTimes[song.id] || 0}
                          onSelect={handleStartPractice}
                          onEdit={setEditingSong}
                          onStartPractice={handleStartPractice}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Drag and Drop View */}
                <DragDropLibrary
                  songs={songs}
                  folders={folders}
                  onSongUpdated={handleSongUpdated}
                  onSongDeleted={handleSongDeleted}
                  onFolderDeleted={handleFolderDeleted}
                  onEdit={setEditingSong}
                  onStartPractice={handleStartPractice}
                  practiceTimes={practiceTimes}
                />
              </>
            )}

            {songs.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No songs yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Start building your music library by adding your first song.
                  </p>
                  <Button onClick={() => setShowCreateSong(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Song
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <PracticeAnalytics />
          </TabsContent>

          <TabsContent value="goals">
            <GoalSetting />
          </TabsContent>
        </Tabs>
      </main>

      <CreateSongDialog
        isOpen={showCreateSong}
        onClose={() => setShowCreateSong(false)}
        onSongCreated={handleSongCreated}
        folders={folders}
      />

      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onFolderCreated={handleFolderCreated}
      />
      
      <EditFolderDialog
        isOpen={!!editingFolder}
        onClose={() => setEditingFolder(null)}
        onFolderUpdated={handleFolderUpdated}
        folder={editingFolder}
      />

      <EditSongDialog
        isOpen={!!editingSong}
        onClose={() => setEditingSong(null)}
        onSongUpdated={handleSongUpdated}
        song={editingSong}
        folders={folders}
      />

      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
      />


    </div>
  )
}