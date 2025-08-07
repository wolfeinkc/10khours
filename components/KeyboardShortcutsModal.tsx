'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Keyboard, Zap } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutGroup {
  title: string
  description: string
  shortcuts: Array<{
    keys: string[]
    description: string
  }>
}

export default function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
  const cmdKey = isMac ? '⌘' : 'Ctrl'

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'General',
      description: 'Navigate and manage your practice library',
      shortcuts: [
        { keys: [cmdKey, 'N'], description: 'Create new song' },
        { keys: [cmdKey, 'Shift', 'N'], description: 'Create new folder' },
        { keys: [cmdKey, ','], description: 'Open settings' },
        { keys: [cmdKey, 'K'], description: 'Search songs and folders' },
        { keys: ['Escape'], description: 'Close modal or cancel action' },
        { keys: ['?'], description: 'Show keyboard shortcuts' }
      ]
    },
    {
      title: 'Practice Timer',
      description: 'Control your practice sessions',
      shortcuts: [
        { keys: ['Space'], description: 'Play/Pause timer' },
        { keys: ['S'], description: 'Stop timer' },
        { keys: ['M'], description: 'Toggle metronome' },
        { keys: ['F'], description: 'Toggle fullscreen mode' },
        { keys: [cmdKey, 'Enter'], description: 'Save practice notes' },
        { keys: ['Escape'], description: 'Cancel note editing' }
      ]
    },
    {
      title: 'Navigation',
      description: 'Move between different sections',
      shortcuts: [
        { keys: ['1'], description: 'Go to Library tab' },
        { keys: ['2'], description: 'Go to Analytics tab' },
        { keys: ['3'], description: 'Go to Goals tab' },
        { keys: ['Tab'], description: 'Navigate between elements' },
        { keys: ['Shift', 'Tab'], description: 'Navigate backwards' }
      ]
    },
    {
      title: 'Organization',
      description: 'Organize your music library',
      shortcuts: [
        { keys: ['O'], description: 'Toggle organize mode' },
        { keys: ['Enter'], description: 'Confirm drag & drop action' },
        { keys: ['Escape'], description: 'Cancel drag operation' },
        { keys: [cmdKey, 'A'], description: 'Select all songs' },
        { keys: ['Delete'], description: 'Delete selected item' }
      ]
    }
  ]

  const renderKeys = (keys: string[]) => (
    <div className="flex items-center space-x-1">
      {keys.map((key, index) => (
        <div key={index} className="flex items-center">
          <Badge variant="outline" className="px-2 py-1 text-xs font-mono bg-muted">
            {key}
          </Badge>
          {index < keys.length - 1 && (
            <span className="mx-1 text-muted-foreground">+</span>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5" />
            <span>Keyboard Shortcuts</span>
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {shortcutGroups.map((group, groupIndex) => (
            <Card key={groupIndex}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>{group.title}</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  {group.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm text-foreground flex-1 mr-4">
                        {shortcut.description}
                      </span>
                      {renderKeys(shortcut.keys)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Pro Tips:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Most shortcuts work globally, even when not focused on specific elements</li>
                <li>• Practice timer shortcuts only work when the timer is active</li>
                <li>• Press <Badge variant="outline" className="mx-1 px-1 py-0 text-xs">?</Badge> anytime to see this help</li>
                <li>• Shortcuts are disabled when typing in text fields</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
