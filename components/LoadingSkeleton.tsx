'use client'

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'dashboard' | 'analytics'
  count?: number
  className?: string
}

export default function LoadingSkeleton({ 
  variant = 'card', 
  count = 1, 
  className = '' 
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`animate-pulse bg-white rounded-lg border p-4 space-y-3 ${className}`}>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="flex space-x-2 pt-2">
              <div className="h-8 bg-gray-200 rounded flex-1"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        )

      case 'list':
        return (
          <div className={`animate-pulse space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-white rounded border">
                <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        )

      case 'dashboard':
        return (
          <div className={`animate-pulse space-y-6 ${className}`}>
            {/* Header skeleton */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="flex space-x-2">
                <div className="h-10 w-24 bg-gray-200 rounded"></div>
                <div className="h-10 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>

            {/* Action bar skeleton */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
              <div className="h-10 w-48 bg-gray-200 rounded"></div>
              <div className="flex space-x-2">
                <div className="h-10 w-28 bg-gray-200 rounded"></div>
                <div className="h-10 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>

            {/* Cards grid skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-lg border p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'analytics':
        return (
          <div className={`animate-pulse space-y-6 ${className}`}>
            {/* Tabs skeleton */}
            <div className="flex space-x-4 border-b">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-20 bg-gray-200 rounded-t"></div>
              ))}
            </div>

            {/* Chart skeleton */}
            <div className="bg-white rounded-lg border p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-64 bg-gray-100 rounded flex items-end justify-around p-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="bg-gray-200 rounded-t w-8"
                    style={{ height: `${Math.random() * 80 + 20}%` }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return (
          <div className={`animate-pulse bg-gray-200 rounded h-20 ${className}`}></div>
        )
    }
  }

  if (variant === 'card' || variant === 'list') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>{renderSkeleton()}</div>
        ))}
      </div>
    )
  }

  return renderSkeleton()
}

// Specific skeleton components for common use cases
export const SongCardSkeleton = () => (
  <LoadingSkeleton variant="card" className="min-h-[140px]" />
)

export const DashboardSkeleton = () => (
  <LoadingSkeleton variant="dashboard" />
)

export const AnalyticsSkeleton = () => (
  <LoadingSkeleton variant="analytics" />
)

export const SongListSkeleton = ({ count = 3 }: { count?: number }) => (
  <LoadingSkeleton variant="list" count={count} />
)
