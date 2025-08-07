'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  User, 
  Bell, 
  Palette, 
  Timer, 
  Moon,
  Sun,
  Monitor,
  Download,
  Trash2,
  Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Database } from '@/lib/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']
type Song = Database['public']['Tables']['songs']['Row']

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
  autoSave: boolean
  defaultMetronomeBPM: number
  defaultMetronomeVolume: number
  sessionTimeout: number
  wakeLockEnabled: boolean
  compactMode: boolean
  showPracticeStats: boolean
  exportFormat: 'json' | 'csv'
}

const defaultSettings: AppSettings = {
  theme: 'system',
  notifications: true,
  autoSave: true,
  defaultMetronomeBPM: 120,
  defaultMetronomeVolume: 50,
  sessionTimeout: 30,
  wakeLockEnabled: true,
  compactMode: false,
  showPracticeStats: true,
  exportFormat: 'json'
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user, signOut } = useAuth()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user && open) {
      loadProfile()
      loadSettings()
    }
  }, [user, open, loadProfile])

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('practiceAppSettings')
    if (savedSettings) {
      setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) })
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      localStorage.setItem('practiceAppSettings', JSON.stringify(settings))
      // Apply theme changes immediately
      applyTheme(settings.theme)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const applyTheme = (theme: string) => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return

    setIsLoading(true)
    try {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const profileData = {
        id: user.id,
        email: user.email || '',
        full_name: updates.full_name || existingProfile?.full_name || null,
        user_type: existingProfile?.user_type || 'student',
        subscription_status: existingProfile?.subscription_status || 'free',
        created_at: existingProfile?.created_at || new Date().toISOString(),
        ...updates
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Failed to update profile: ${error.message}`)
      }
      
      setProfile(data)
      alert('Profile updated successfully!')
    } catch (error: unknown) {
      console.error('Error updating profile:', error)
      alert(`Error updating profile: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async () => {
    if (!user) return

    try {
      const { data: songs } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', user.id)

      const { data: folders } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)

      const { data: sessions } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', user.id)

      const exportData = {
        songs: songs || [],
        folders: folders || [],
        sessions: sessions || [],
        profile,
        settings,
        exportedAt: new Date().toISOString()
      }

      const dataStr = settings.exportFormat === 'json' 
        ? JSON.stringify(exportData, null, 2)
        : convertToCSV(exportData)

      const dataBlob = new Blob([dataStr], { 
        type: settings.exportFormat === 'json' ? 'application/json' : 'text/csv' 
      })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `practice-data-${new Date().toISOString().split('T')[0]}.${settings.exportFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const convertToCSV = (data: {songs: Song[]}) => {
    // Simple CSV conversion for songs
    const songs = data.songs
    if (!songs.length) return 'No data to export'

    const headers = Object.keys(songs[0]).join(',')
    const rows = songs.map((song: Song) => 
      Object.values(song).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    ).join('\n')

    return `${headers}\n${rows}`
  }

  const deleteAllData = async () => {
    if (!user) return

    const confirmed = confirm(
      'Are you sure you want to delete ALL your data? This action cannot be undone.\n\n' +
      'This will delete:\n' +
      '• All songs and folders\n' +
      '• All practice sessions\n' +
      '• All goals\n' +
      '• Your profile settings\n\n' +
      'Type "DELETE" to confirm:'
    )

    if (!confirmed) return

    const confirmation = prompt('Type "DELETE" to confirm:')
    if (confirmation !== 'DELETE') return

    setIsLoading(true)
    try {
      // Delete in order due to foreign key constraints
      await supabase.from('practice_sessions').delete().eq('user_id', user.id)
      await supabase.from('practice_goals').delete().eq('user_id', user.id)
      await supabase.from('songs').delete().eq('user_id', user.id)
      await supabase.from('folders').delete().eq('user_id', user.id)
      await supabase.from('profiles').delete().eq('id', user.id)

      localStorage.removeItem('practiceAppSettings')
      alert('All data has been deleted successfully.')
      signOut()
    } catch (error) {
      console.error('Error deleting data:', error)
      alert('Error deleting data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </DialogTitle>
          <DialogDescription>
            Customize your practice tracking experience
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="practice">Practice</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Keyboard Shortcuts</span>
                </CardTitle>
                <CardDescription>
                  Speed up your workflow with these keyboard shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Shortcuts */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">General</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Create new song</span>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">Ctrl</Badge>
                          <span>+</span>
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">N</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Create new folder</span>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">Ctrl</Badge>
                          <span>+</span>
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">Shift</Badge>
                          <span>+</span>
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">N</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Open settings</span>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">Ctrl</Badge>
                          <span>+</span>
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">,</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Search songs</span>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">Ctrl</Badge>
                          <span>+</span>
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">K</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Practice Timer Shortcuts */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Practice Timer</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Play/Pause timer</span>
                        <Badge variant="outline" className="px-2 py-1 text-xs font-mono">Space</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Stop timer</span>
                        <Badge variant="outline" className="px-2 py-1 text-xs font-mono">S</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Toggle metronome</span>
                        <Badge variant="outline" className="px-2 py-1 text-xs font-mono">M</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Close modal</span>
                        <Badge variant="outline" className="px-2 py-1 text-xs font-mono">Escape</Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Navigation Shortcuts */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Navigation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Go to Library tab</span>
                        <Badge variant="outline" className="px-2 py-1 text-xs font-mono">1</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Go to Analytics tab</span>
                        <Badge variant="outline" className="px-2 py-1 text-xs font-mono">2</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Go to Goals tab</span>
                        <Badge variant="outline" className="px-2 py-1 text-xs font-mono">3</Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Organization Shortcuts */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Organization</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Toggle organize mode</span>
                        <Badge variant="outline" className="px-2 py-1 text-xs font-mono">O</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Select all songs</span>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">Ctrl</Badge>
                          <span>+</span>
                          <Badge variant="outline" className="px-2 py-1 text-xs font-mono">A</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Timer className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Pro Tips:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Most shortcuts work globally, even when not focused on specific elements</li>
                        <li>• Practice timer shortcuts only work when the timer is active</li>
                        <li>• Shortcuts are disabled when typing in text fields</li>
                        <li>• Use Escape to close any modal or cancel actions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Account Type</Label>
                    <Input
                      id="type"
                      value={profile?.user_type || 'student'}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile?.full_name || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                    placeholder="Enter your full name"
                  />
                </div>

                <Button 
                  onClick={() => updateProfile({ full_name: profile?.full_name })}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-4 w-4" />
                  <span>Appearance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Theme</Label>
                  <div className="flex space-x-2 mt-2">
                    {[
                      { value: 'light', icon: Sun, label: 'Light' },
                      { value: 'dark', icon: Moon, label: 'Dark' },
                      { value: 'system', icon: Monitor, label: 'System' }
                    ].map(({ value, icon: Icon, label }) => (
                      <Button
                        key={value}
                        variant={settings.theme === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSettings(prev => ({ ...prev, theme: value as 'light' | 'dark' | 'system' }))}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-gray-500">Use smaller cards and spacing</p>
                  </div>
                  <Switch
                    checked={settings.compactMode}
                    onCheckedChange={(checked: boolean) => 
                      setSettings(prev => ({ ...prev, compactMode: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-gray-500">Get reminders and updates</p>
                  </div>
                  <Switch
                    checked={settings.notifications}
                    onCheckedChange={(checked: boolean) => 
                      setSettings(prev => ({ ...prev, notifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Practice Stats</Label>
                    <p className="text-sm text-gray-500">Display statistics in dashboard</p>
                  </div>
                  <Switch
                    checked={settings.showPracticeStats}
                    onCheckedChange={(checked: boolean) => 
                      setSettings(prev => ({ ...prev, showPracticeStats: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practice" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Timer className="h-4 w-4" />
                  <span>Practice Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Default Metronome BPM: {settings.defaultMetronomeBPM}</Label>
                  <Slider
                    value={[settings.defaultMetronomeBPM]}
                    onValueChange={([value]) => 
                      setSettings(prev => ({ ...prev, defaultMetronomeBPM: value }))
                    }
                    min={40}
                    max={200}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Default Metronome Volume: {settings.defaultMetronomeVolume}%</Label>
                  <Slider
                    value={[settings.defaultMetronomeVolume]}
                    onValueChange={([value]) => 
                      setSettings(prev => ({ ...prev, defaultMetronomeVolume: value }))
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Session Timeout: {settings.sessionTimeout} minutes</Label>
                  <Slider
                    value={[settings.sessionTimeout]}
                    onValueChange={([value]) => 
                      setSettings(prev => ({ ...prev, sessionTimeout: value }))
                    }
                    min={5}
                    max={120}
                    step={5}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Automatically pause timer after inactivity
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Screen Wake Lock</Label>
                    <p className="text-sm text-gray-500">Keep screen on during practice</p>
                  </div>
                  <Switch
                    checked={settings.wakeLockEnabled}
                    onCheckedChange={(checked: boolean) => 
                      setSettings(prev => ({ ...prev, wakeLockEnabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-save</Label>
                    <p className="text-sm text-gray-500">Automatically save practice sessions</p>
                  </div>
                  <Switch
                    checked={settings.autoSave}
                    onCheckedChange={(checked: boolean) => 
                      setSettings(prev => ({ ...prev, autoSave: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </CardTitle>
                <CardDescription>
                  Download your practice data for backup or analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Export Format</Label>
                  <div className="flex space-x-2 mt-2">
                    <Button
                      variant={settings.exportFormat === 'json' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, exportFormat: 'json' }))}
                    >
                      JSON
                    </Button>
                    <Button
                      variant={settings.exportFormat === 'csv' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, exportFormat: 'csv' }))}
                    >
                      CSV
                    </Button>
                  </div>
                </div>

                <Button onClick={exportData} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export My Data
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <Shield className="h-4 w-4" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription>
                  Irreversible actions that will permanently delete your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  onClick={deleteAllData}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isLoading ? 'Deleting...' : 'Delete All Data'}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  This will permanently delete all your songs, folders, practice sessions, goals, and profile data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
