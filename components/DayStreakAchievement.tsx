'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Trophy, Flame } from 'lucide-react'

interface DayStreakAchievementProps {
  onPracticeComplete?: () => void
}

export default function DayStreakAchievement({ }: DayStreakAchievementProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [streak, setStreak] = useState(0)
  const [showAchievement, setShowAchievement] = useState(false)
  const [, setIsFirstPracticeToday] = useState(false)

  useEffect(() => {
    if (user) {
      calculateStreak()
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    const handlePracticeComplete = () => {
      checkFirstPracticeToday()
    }

    window.addEventListener('practiceSessionCompleted', handlePracticeComplete)
    return () => window.removeEventListener('practiceSessionCompleted', handlePracticeComplete)
  }, [user])

  const calculateStreak = async () => {
    if (!user) return

    try {
      // Get practice sessions ordered by date
      const { data: sessions, error } = await supabase
        .from('practice_sessions')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching practice sessions:', error)
        return
      }

      if (!sessions || sessions.length === 0) {
        setStreak(0)
        return
      }

      // Calculate streak
      let currentStreak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const uniqueDates = new Set<string>()
      sessions.forEach(session => {
        const sessionDate = new Date(session.created_at)
        sessionDate.setHours(0, 0, 0, 0)
        uniqueDates.add(sessionDate.toISOString())
      })

      const sortedDates = Array.from(uniqueDates).sort().reverse()
      
      for (let i = 0; i < sortedDates.length; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        
        if (sortedDates.includes(checkDate.toISOString())) {
          currentStreak++
        } else {
          break
        }
      }

      setStreak(currentStreak)
    } catch (error) {
      console.error('Error calculating streak:', error)
    }
  }

  const checkFirstPracticeToday = async () => {
    if (!user) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: todaySessions, error } = await supabase
        .from('practice_sessions')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())

      if (error) {
        console.error('Error checking today sessions:', error)
        return
      }

      // If this is the first practice today, show achievement
      if (todaySessions && todaySessions.length === 1) {
        setIsFirstPracticeToday(true)
        await calculateStreak() // Recalculate streak
        setShowAchievement(true)
        
        // Hide achievement after 3 seconds and fade to grey
        setTimeout(() => {
          setShowAchievement(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Error checking first practice today:', error)
    }
  }

  if (streak === 0) return null

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all duration-500 ${
      showAchievement 
        ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-lg transform scale-110' 
        : 'bg-gray-100 text-gray-600'
    }`}>
      <div className={`transition-all duration-500 ${showAchievement ? 'animate-bounce' : ''}`}>
        {showAchievement ? (
          <Trophy className="h-5 w-5 text-yellow-300" />
        ) : (
          <Flame className="h-4 w-4" />
        )}
      </div>
      <span className={`font-semibold text-sm transition-all duration-500 ${
        showAchievement ? 'text-white' : 'text-gray-600'
      }`}>
        {streak} Day Streak
      </span>
      {showAchievement && (
        <div className="text-xs font-medium animate-pulse">
          🎉 Keep it up!
        </div>
      )}
    </div>
  )
}
