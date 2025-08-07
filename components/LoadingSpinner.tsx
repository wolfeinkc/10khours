'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  className,
  text = 'Loading...'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  )
}

// Full page loading component
export function FullPageLoader({ text = 'Loading your practice data...' }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="absolute inset-0 h-12 w-12 border-2 border-primary/20 rounded-full animate-pulse mx-auto" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Practice Tracker</h2>
          <p className="text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  )
}

// Inline loading for components
export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    </div>
  )
}
