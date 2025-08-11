'use client'

import { useState, useEffect } from 'react'
import useScreenWakeLock from '@/hooks/useScreenWakeLock'

export default function WakeLockTest() {
  const { isWakeLockSupported, isWakeLockActive, enableWakeLock, disableWakeLock } = useScreenWakeLock()
  const [logs, setLogs] = useState<string[]>([])
  const [testStartTime, setTestStartTime] = useState<Date | null>(null)
  const [testDuration, setTestDuration] = useState<number>(0)

  // Add a log message with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12)
    setLogs(prevLogs => [`${timestamp} - ${message}`, ...prevLogs].slice(0, 50))
  }

  // Start the wake lock test
  const startTest = async () => {
    addLog('Starting wake lock test')
    const success = await enableWakeLock()
    if (success) {
      addLog('✅ Wake lock activated successfully')
      setTestStartTime(new Date())
    } else {
      addLog('❌ Failed to activate wake lock')
    }
  }

  // End the wake lock test
  const endTest = async () => {
    await disableWakeLock()
    addLog('🛑 Wake lock test ended')
    setTestStartTime(null)
  }

  // Update test duration
  useEffect(() => {
    if (!testStartTime) return

    const timer = setInterval(() => {
      const now = new Date()
      const duration = Math.floor((now.getTime() - testStartTime.getTime()) / 1000)
      setTestDuration(duration)
    }, 1000)

    return () => clearInterval(timer)
  }, [testStartTime])

  // Monitor wake lock status changes
  useEffect(() => {
    addLog(`Wake lock status changed: ${isWakeLockActive ? 'active' : 'inactive'}`)
  }, [isWakeLockActive])

  // Test device info
  useEffect(() => {
    const userAgent = navigator.userAgent
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const hasNativeWakeLock = 'wakeLock' in navigator
    addLog(`Device: ${isMobile ? 'Mobile' : 'Desktop'} (${userAgent.substring(0, 50)}...)`)
    addLog(`Native Wake Lock API: ${hasNativeWakeLock ? 'Supported' : 'Not Supported'}`)
    addLog(`NoSleep.js Library: Available`)
    addLog(`Overall Wake Lock Support: ${isWakeLockSupported ? 'Yes' : 'No'}`)
  }, [isWakeLockSupported])

  // Listen for visibility change events
  useEffect(() => {
    const handleVisibilityChange = () => {
      addLog(`Page visibility changed: ${document.visibilityState}`)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Wake Lock Test Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <div className="flex flex-col gap-2">
          <div>
            <span className="font-semibold">Wake Lock API Supported:</span> 
            <span className={isWakeLockSupported ? "text-green-600" : "text-red-600"}>
              {isWakeLockSupported ? "Yes" : "No"}
            </span>
          </div>
          <div>
            <span className="font-semibold">Wake Lock Status:</span> 
            <span className={isWakeLockActive ? "text-green-600" : "text-red-600"}>
              {isWakeLockActive ? "Active" : "Inactive"}
            </span>
          </div>
          {testStartTime && (
            <div>
              <span className="font-semibold">Test Duration:</span> {testDuration} seconds
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-4 mb-6">
        <button 
          onClick={startTest} 
          disabled={isWakeLockActive}
          className={`px-4 py-2 rounded-lg ${
            isWakeLockActive 
              ? "bg-gray-300 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Enable Wake Lock
        </button>
        
        <button 
          onClick={endTest} 
          disabled={!isWakeLockActive}
          className={`px-4 py-2 rounded-lg ${
            !isWakeLockActive 
              ? "bg-gray-300 cursor-not-allowed" 
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          Disable Wake Lock
        </button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal pl-6">
          <li>Click &quot;Enable Wake Lock&quot; to start the test</li>
          <li>Leave your device inactive (don&apos;t touch the screen)</li>
          <li>The screen should stay on (not timeout/lock)</li>
          <li>If the screen stays on for your device&apos;s normal timeout period, the wake lock is working</li>
          <li>Click &quot;Disable Wake Lock&quot; to end the test</li>
        </ol>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Event Log</h2>
        <div className="h-64 overflow-y-auto bg-gray-100 p-3 rounded-lg font-mono text-sm">
          {logs.map((log, index) => (
            <div key={index} className="border-b border-gray-200 py-1">{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
