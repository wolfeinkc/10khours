'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Database } from '@/lib/supabase'

type PracticeSession = Database['public']['Tables']['practice_sessions']['Row']
type Song = Database['public']['Tables']['songs']['Row']

interface ChartData {
  label: string
  date: string
  songBreakdown: Array<{
    songId: string
    songTitle: string
    minutes: number
    color: string
  }>
  totalMinutes: number
}

interface PracticeChartProps {
  sessions: PracticeSession[]
  songs: Song[]
}

type ViewType = 'daily' | 'weekly' | 'monthly'

const CHART_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
]

export default function PracticeChart({ sessions, songs }: PracticeChartProps) {
  const [viewType, setViewType] = useState<ViewType>('daily')

  const chartData = useMemo(() => {
    const now = new Date()
    const data: ChartData[] = []

    if (viewType === 'daily') {
      // Show last 6 days + today (7 total)
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const daySessions = sessions.filter(session => 
          session.created_at.startsWith(dateStr)
        )
        
        const songBreakdown = new Map<string, { minutes: number, title: string, color: string }>()
        
        daySessions.forEach(session => {
          const song = songs.find(s => s.id === session.song_id)
          if (song) {
            const existing = songBreakdown.get(song.id) || { minutes: 0, title: song.title, color: song.color }
            existing.minutes += session.duration_minutes || 0
            songBreakdown.set(song.id, existing)
          }
        })

        data.push({
          label: i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' }),
          date: dateStr,
          songBreakdown: Array.from(songBreakdown.entries()).map(([songId, data]) => ({
            songId,
            songTitle: data.title,
            minutes: data.minutes,
            color: data.color
          })),
          totalMinutes: Array.from(songBreakdown.values()).reduce((sum, s) => sum + s.minutes, 0)
        })
      }
    } else if (viewType === 'weekly') {
      // Show last 8 weeks (Sunday to Saturday)
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - (now.getDay() + 7 * i))
        weekStart.setHours(0, 0, 0, 0)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        const weekSessions = sessions.filter(session => {
          const sessionDate = new Date(session.created_at)
          return sessionDate >= weekStart && sessionDate <= weekEnd
        })

        const songBreakdown = new Map<string, { minutes: number, title: string, color: string }>()
        
        weekSessions.forEach(session => {
          const song = songs.find(s => s.id === session.song_id)
          if (song) {
            const existing = songBreakdown.get(song.id) || { minutes: 0, title: song.title, color: song.color }
            existing.minutes += session.duration_minutes || 0
            songBreakdown.set(song.id, existing)
          }
        })

        data.push({
          label: `Week ${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
          date: weekStart.toISOString().split('T')[0],
          songBreakdown: Array.from(songBreakdown.entries()).map(([songId, data]) => ({
            songId,
            songTitle: data.title,
            minutes: data.minutes,
            color: data.color
          })),
          totalMinutes: Array.from(songBreakdown.values()).reduce((sum, s) => sum + s.minutes, 0)
        })
      }
    } else if (viewType === 'monthly') {
      // Show last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)

        const monthSessions = sessions.filter(session => {
          const sessionDate = new Date(session.created_at)
          return sessionDate >= monthStart && sessionDate <= monthEnd
        })

        const totalMinutes = monthSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0)

        data.push({
          label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          date: monthStart.toISOString().split('T')[0],
          songBreakdown: [], // Monthly view shows total only
          totalMinutes
        })
      }
    }

    return data
  }, [sessions, songs, viewType])

  const maxMinutes = Math.max(...chartData.map(d => d.totalMinutes), 60) // Minimum 60 for scale

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Get unique songs for the legend
  const legendSongs = useMemo(() => {
    const songMap = new Map<string, { title: string, color: string, totalMinutes: number }>()
    
    chartData.forEach(day => {
      day.songBreakdown.forEach(song => {
        const existing = songMap.get(song.songId) || { title: song.songTitle, color: song.color, totalMinutes: 0 }
        existing.totalMinutes += song.minutes
        songMap.set(song.songId, existing)
      })
    })

    return Array.from(songMap.entries())
      .map(([songId, data]) => ({ songId, ...data }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
  }, [chartData])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Practice Chart</CardTitle>
          <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend for Daily and Weekly views */}
        {(viewType === 'daily' || viewType === 'weekly') && legendSongs.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Song Totals</h4>
            <div className="flex flex-wrap gap-3">
              {legendSongs.map(song => (
                <div key={song.songId} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: song.color }}
                  />
                  <span className="text-sm text-gray-700">
                    {song.title}: {formatMinutes(song.totalMinutes)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col-reverse justify-between text-xs text-gray-500">
            {[0, Math.floor(maxMinutes * 0.25), Math.floor(maxMinutes * 0.5), Math.floor(maxMinutes * 0.75), maxMinutes].map(value => (
              <div key={value} className="text-right pr-2">
                {value > 60 ? `${Math.floor(value / 60)}h` : `${value}m`}
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="ml-14 mr-2">
            <div className="flex items-end justify-between h-64 border-b border-l border-gray-200">
              {chartData.map((item, index) => (
                <div key={item.date} className="flex flex-col items-center flex-1 max-w-16">
                  {/* Bar */}
                  <div className="w-full px-1 mb-2">
                    {viewType === 'monthly' ? (
                      // Single colored bar for monthly view
                      <div
                        className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                        style={{
                          height: `${Math.max((item.totalMinutes / maxMinutes) * 240, 2)}px`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                        }}
                        title={`${item.label}: ${formatMinutes(item.totalMinutes)}`}
                      />
                    ) : (
                      // Stacked bars for daily/weekly view
                      <div className="w-full flex flex-col-reverse">
                        {item.songBreakdown.map(song => (
                          <div
                            key={song.songId}
                            className="w-full transition-all duration-300 hover:opacity-80"
                            style={{
                              height: `${Math.max((song.minutes / maxMinutes) * 240, 1)}px`,
                              backgroundColor: song.color
                            }}
                            title={`${song.songTitle}: ${formatMinutes(song.minutes)}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* X-axis label */}
                  <div className="text-xs text-gray-600 text-center leading-tight">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 text-center text-sm text-gray-600">
          Total practice time: {formatMinutes(chartData.reduce((sum, item) => sum + item.totalMinutes, 0))}
        </div>
      </CardContent>
    </Card>
  )
}
