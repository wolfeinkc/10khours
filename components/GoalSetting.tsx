'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Target, Plus, Edit2, Trash2, CheckCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

interface PracticeGoal {
  id: string
  user_id: string
  title: string
  description: string | null
  goal_type: 'daily_minutes' | 'weekly_minutes' | 'monthly_minutes' | 'total_sessions' | 'streak_days' | 'song_mastery'
  target_value: number
  current_progress: number
  deadline: string | null
  is_completed: boolean
  created_at: string
}

interface GoalFormData {
  title: string
  description: string
  goal_type: PracticeGoal['goal_type']
  target_value: number
  deadline: string
}

const goalTypes = [
  { value: 'daily_minutes', label: 'Daily Practice Minutes', unit: 'minutes' },
  { value: 'weekly_minutes', label: 'Weekly Practice Minutes', unit: 'minutes' },
  { value: 'monthly_minutes', label: 'Monthly Practice Minutes', unit: 'minutes' },
  { value: 'total_sessions', label: 'Total Practice Sessions', unit: 'sessions' },
  { value: 'streak_days', label: 'Practice Streak Days', unit: 'days' },
  { value: 'song_mastery', label: 'Songs to Master', unit: 'songs' }
]

export default function GoalSetting() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [goals, setGoals] = useState<PracticeGoal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<PracticeGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    goal_type: 'daily_minutes',
    target_value: 30,
    deadline: ''
  })

  useEffect(() => {
    if (user) {
      fetchGoals()
    }
  }, [user])

  // Auto-refresh when practice sessions are completed
  useEffect(() => {
    if (!user) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'practiceSessionCompleted') {
        fetchGoals()
      }
    }

    const handleCustomRefresh = () => {
      fetchGoals()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('refreshGoals', handleCustomRefresh)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('refreshGoals', handleCustomRefresh)
    }
  }, [user])

  const fetchGoals = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // First, check if the goals table exists, if not we'll need to create it
      const { data: goalsData, error } = await supabase
        .from('practice_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist, we'll create mock goals for now
        console.log('Goals table not found, using mock data')
        setGoals([])
      } else {
        setGoals(goalsData || [])
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
      setGoals([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.title.trim()) return

    setSubmitting(true)
    try {
      const goalData = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        goal_type: formData.goal_type,
        target_value: formData.target_value,
        current_progress: 0,
        deadline: formData.deadline || null,
        is_completed: false
      }

      if (editingGoal) {
        // Update existing goal
        const { data, error } = await supabase
          .from('practice_goals')
          .update(goalData)
          .eq('id', editingGoal.id)
          .select()
          .single()

        if (error) throw error
        
        setGoals(prev => prev.map(goal => 
          goal.id === editingGoal.id ? data : goal
        ))
      } else {
        // Create new goal
        const { data, error } = await supabase
          .from('practice_goals')
          .insert(goalData)
          .select()
          .single()

        if (error) throw error
        
        setGoals(prev => [data, ...prev])
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        goal_type: 'daily_minutes',
        target_value: 30,
        deadline: ''
      })
      setShowForm(false)
      setEditingGoal(null)
    } catch (error) {
      console.error('Error saving goal:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (goal: PracticeGoal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      description: goal.description || '',
      goal_type: goal.goal_type,
      target_value: goal.target_value,
      deadline: goal.deadline ? goal.deadline.split('T')[0] : ''
    })
    setShowForm(true)
  }

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const { error } = await supabase
        .from('practice_goals')
        .delete()
        .eq('id', goalId)

      if (error) throw error
      
      setGoals(prev => prev.filter(goal => goal.id !== goalId))
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const toggleComplete = async (goal: PracticeGoal) => {
    try {
      const { data, error } = await supabase
        .from('practice_goals')
        .update({ is_completed: !goal.is_completed })
        .eq('id', goal.id)
        .select()
        .single()

      if (error) throw error
      
      setGoals(prev => prev.map(g => 
        g.id === goal.id ? data : g
      ))
    } catch (error) {
      console.error('Error updating goal:', error)
    }
  }

  const getProgressPercentage = (goal: PracticeGoal): number => {
    return Math.min(100, Math.round((goal.current_progress / goal.target_value) * 100))
  }

  const getGoalTypeLabel = (type: string): string => {
    return goalTypes.find(gt => gt.value === type)?.label || type
  }

  const getGoalUnit = (type: string): string => {
    return goalTypes.find(gt => gt.value === type)?.unit || ''
  }

  const isDeadlineApproaching = (deadline: string | null): boolean => {
    if (!deadline) return false
    const deadlineDate = new Date(deadline)
    const now = new Date()
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilDeadline <= 7 && daysUntilDeadline > 0
  }

  const isOverdue = (deadline: string | null): boolean => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Practice Goals</h2>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Goal Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Practice 30 minutes daily"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details about your goal..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goal_type">Goal Type</Label>
                  <Select 
                    value={formData.goal_type} 
                    onValueChange={(value: PracticeGoal['goal_type']) => 
                      setFormData(prev => ({ ...prev, goal_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goalTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target_value">Target Value</Label>
                  <Input
                    id="target_value"
                    type="number"
                    min="1"
                    value={formData.target_value}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      target_value: parseInt(e.target.value) || 1 
                    }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false)
                    setEditingGoal(null)
                    setFormData({
                      title: '',
                      description: '',
                      goal_type: 'daily_minutes',
                      target_value: 30,
                      deadline: ''
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No goals yet</h3>
              <p className="text-gray-500 mb-4">
                Set practice goals to stay motivated and track your progress.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          goals.map(goal => (
            <Card key={goal.id} className={`${goal.is_completed ? 'bg-green-50 border-green-200' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className={`text-lg font-semibold ${goal.is_completed ? 'text-green-800' : 'text-gray-900'}`}>
                        {goal.title}
                      </h3>
                      {goal.is_completed && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {goal.deadline && isDeadlineApproaching(goal.deadline) && !goal.is_completed && (
                        <Clock className="h-5 w-5 text-orange-500" />
                      )}
                      {goal.deadline && isOverdue(goal.deadline) && !goal.is_completed && (
                        <Clock className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {getGoalTypeLabel(goal.goal_type)}
                    </p>
                    
                    {goal.description && (
                      <p className="text-sm text-gray-500 mb-3">{goal.description}</p>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          {goal.current_progress} / {goal.target_value} {getGoalUnit(goal.goal_type)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            goal.is_completed ? 'bg-green-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${getProgressPercentage(goal)}%` }}
                        />
                      </div>
                    </div>
                    
                    {goal.deadline && (
                      <p className={`text-xs mt-2 ${
                        isOverdue(goal.deadline) ? 'text-red-600' : 
                        isDeadlineApproaching(goal.deadline) ? 'text-orange-600' : 
                        'text-gray-500'
                      }`}>
                        Deadline: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComplete(goal)}
                    >
                      {goal.is_completed ? 'Mark Incomplete' : 'Mark Complete'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(goal)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
