'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button' // Unused
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, Target, TrendingUp, Music, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Database } from '@/lib/supabase'
import PracticeChart from './PracticeChart'

type PracticeSession = Database['public']['Tables']['practice_sessions']['Row']
type Song = Database['public']['Tables']['songs']['Row']

interface PracticeStats {
  totalMinutes: number
  totalSessions: number
  averageSessionLength: number
  streakDays: number
  mostPracticedSong: string
  practiceGoalProgress: number
}

interface DailyPractice {
  date: string
  minutes: number
  sessions: number
}

interface SongPracticeData {
  songId: string
  songTitle: string
  totalMinutes: number
  sessionCount: number
  lastPracticed: string
}

// Calculate streak helper function - defined outside the component
const calculateStreak = (sessions: PracticeSession[]): number => {
  if (sessions.length === 0) return 0;
  
  // Get unique dates with practice sessions
  const uniqueDates = new Set(
    sessions.map(session => new Date(session.created_at).toDateString())
  );

  // Calculate consecutive days from today backwards
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateString = checkDate.toDateString();
    
    if (uniqueDates.has(dateString)) {
      streak++;
    } else if (i > 0) { // Don't break on first day (today) if no practice yet
      break;
    }
  }
  
  return streak;
};

export default function PracticeAnalytics() {
  const { user } = useAuth()
  const supabase = createClient()
  
  // Component state
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [dailyData, setDailyData] = useState<DailyPractice[]>([])
  const [songData, setSongData] = useState<SongPracticeData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')
  const [stats, setStats] = useState<PracticeStats>({
    totalMinutes: 0,
    totalSessions: 0,
    averageSessionLength: 0,
    streakDays: 0,
    mostPracticedSong: '',
    practiceGoalProgress: 0
  })

  // Memoize the calculateDailyData function with timezone handling
  const calculateDailyData = useCallback((sessions: PracticeSession[]): DailyPractice[] => {
    const dailyMap = sessions.reduce((acc, session) => {
      // Use local timezone for date grouping
      const sessionDate = new Date(session.created_at);
      const localDate = new Date(sessionDate.getTime() - sessionDate.getTimezoneOffset() * 60000);
      const date = localDate.toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = { date, minutes: 0, sessions: 0 };
      }
      acc[date].minutes += session.duration_minutes || 0;
      acc[date].sessions += 1;
      return acc;
    }, {} as Record<string, DailyPractice>);

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  // Memoize the calculateSongData function
  const calculateSongData = useCallback((sessions: PracticeSession[], songs: Song[]): SongPracticeData[] => {
    const songMap = sessions.reduce((acc, session) => {
      const song = songs.find(s => s.id === session.song_id);
      if (song) {
        if (!acc[song.id]) {
          acc[song.id] = {
            songId: song.id,
            songTitle: song.title || 'Unknown Song',
            totalMinutes: 0,
            sessionCount: 0,
            lastPracticed: session.created_at
          };
        }
        acc[song.id].totalMinutes += session.duration_minutes || 0;
        acc[song.id].sessionCount += 1;
        
        // Update last practiced if this session is more recent
        if (new Date(session.created_at) > new Date(acc[song.id].lastPracticed)) {
          acc[song.id].lastPracticed = session.created_at;
        }
      }
      return acc;
    }, {} as Record<string, SongPracticeData>);

    return Object.values(songMap)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 10); // Return top 10 songs
  }, []);



  const calculateStats = useCallback((sessions: PracticeSession[], songs: Song[]) => {
    const totalMinutes = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
    const totalSessions = sessions.length;
    const averageSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    
    // Calculate streak
    const streakDays = calculateStreak(sessions);
    
    // Find most practiced song
    const songMinutes = sessions.reduce((acc, session) => {
      const song = songs.find(s => s.id === session.song_id);
      if (song) {
        acc[song.title] = (acc[song.title] || 0) + (session.duration_minutes || 0);
      }
      return acc;
    }, {} as Record<string, number>);
    
    const mostPracticedSong = Object.entries(songMinutes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
    
    // Calculate goal progress (30 minutes per day goal)
    const daysInRange = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const goalMinutes = 30 * daysInRange;
    const practiceGoalProgress = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100));
    
    setStats({
      totalMinutes,
      totalSessions,
      averageSessionLength,
      streakDays,
      mostPracticedSong,
      practiceGoalProgress
    });
  }, [timeRange]);

  // Process data and update state
  const processData = useCallback((sessions: PracticeSession[], songs: Song[]) => {
    // Calculate daily data
    const dailyData = calculateDailyData(sessions);
    setDailyData(dailyData);
    
    // Calculate song data
    const songData = calculateSongData(sessions, songs);
    setSongData(songData);
    
    // Calculate stats
    calculateStats(sessions, songs);
  }, [calculateDailyData, calculateSongData, calculateStats]);



  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Calculate date range using user's timezone
      const now = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      // Set to start of day in user's timezone
      startDate.setHours(0, 0, 0, 0);

      // Fetch practice sessions
      const { data: sessionsData } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Fetch songs
      const { data: songsData } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', user.id);

      if (sessionsData && songsData) {
        setSessions(sessionsData);
        setSongs(songsData);
        
        // Process all derived data
        processData(sessionsData, songsData);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange, processData, supabase]);

  // Fetch data when component mounts or when timeRange changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for refresh events from practice sessions
  useEffect(() => {
    const handleRefresh = () => {
      fetchData();
    };

    window.addEventListener('refreshAnalytics', handleRefresh);
    return () => {
      window.removeEventListener('refreshAnalytics', handleRefresh);
    };
  }, [fetchData]);

  // Format duration helper function
  const formatDuration = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }, []);

  // Format date helper function
  const formatDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Practice Analytics</h2>
        <Select value={timeRange} onValueChange={(value: 'week' | 'month' | 'year') => setTimeRange(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Past Week</SelectItem>
            <SelectItem value="month">Past Month</SelectItem>
            <SelectItem value="year">Past Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Practice</p>
                <p className="text-2xl font-bold">{formatDuration(stats.totalMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Practice Streak</p>
                <p className="text-2xl font-bold">{stats.streakDays} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Session</p>
                <p className="text-2xl font-bold">{stats.averageSessionLength}m</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Goal Progress</p>
                <p className="text-2xl font-bold">{stats.practiceGoalProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Practice</TabsTrigger>
          <TabsTrigger value="songs">Song Breakdown</TabsTrigger>
          <TabsTrigger value="goals">Goals & Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <PracticeChart sessions={sessions} songs={songs} />
        </TabsContent>

        <TabsContent value="songs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Practiced Songs</CardTitle>
            </CardHeader>
            <CardContent>
              {songData.length > 0 ? (
                <div className="space-y-3">
                  {songData.map((song, index) => (
                    <div key={song.songId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{song.songTitle}</p>
                          <p className="text-sm text-gray-500">
                            Last practiced: {formatDate(song.lastPracticed)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatDuration(song.totalMinutes)}</p>
                        <p className="text-sm text-gray-500">{song.sessionCount} sessions</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No song practice data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practice Goals & Achievements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Goal Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Daily Practice Goal (30 minutes)</h4>
                  <span className="text-sm text-gray-600">{stats.practiceGoalProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, stats.practiceGoalProgress)}%` }}
                  />
                </div>
              </div>

              {/* Achievements */}
              <div className="space-y-3">
                <h4 className="font-medium">Recent Achievements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.streakDays >= 7 && (
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <Award className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Week Warrior</p>
                        <p className="text-sm text-green-600">7+ day practice streak</p>
                      </div>
                    </div>
                  )}
                  
                  {stats.totalMinutes >= 60 && (
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">Hour Hero</p>
                        <p className="text-sm text-blue-600">1+ hour practiced</p>
                      </div>
                    </div>
                  )}
                  
                  {stats.totalSessions >= 10 && (
                    <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                      <Music className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-800">Session Master</p>
                        <p className="text-sm text-purple-600">10+ practice sessions</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
