'use client'

import { useState, useEffect } from 'react'

interface ChatLog {
  id: string
  userId: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

interface UserProfile {
  userId: string
  name?: string
  email?: string
  phone?: string
  createdAt: string
  updatedAt: string
  sessionId: string
}

interface ConversationSession {
  sessionId: string
  logs: ChatLog[]
  messageCount: number
  firstMessage: string
  lastMessage: string
  startTime: string
  endTime: string
  userProfile?: UserProfile
}

interface EnvironmentInfo {
  isVercel: boolean
  storageType: string
}

interface DailyTokenUsage {
  date: string
  totalTokens: number
  completionTokens: number
  promptTokens: number
  requestCount: number
  uniqueUsers: number
  uniqueSessions: number
}

interface TokenUsageData {
  todayUsage: DailyTokenUsage | null
  history: DailyTokenUsage[]
  stats: {
    totalTokensAllTime: number
    totalRequests: number
    avgTokensPerRequest: number
    mostActiveDate: string | null
    daysTracked: number
  }
  environment: EnvironmentInfo
  timestamp: string
}

interface ApiResponse {
  chatLogs: ChatLog[]
  count: number
  userId: string
  environment: EnvironmentInfo
  dbConnectionStatus?: boolean
  message: string
}

interface DebugInfo {
  requestId: string
  errorType: string
  errorMessage?: string
  errorName?: string
  totalTime?: number
  timestamp?: string
  responseType?: string
  responseTime?: number
  groqResponseTime?: number
}

export default function TestMemoryPage() {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([])
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null)
  const [environmentMessage, setEnvironmentMessage] = useState<string>('')
  const [dbConnectionStatus, setDbConnectionStatus] = useState<boolean | null>(null)
  const [tokenUsageData, setTokenUsageData] = useState<TokenUsageData | null>(null)
  const [tokenUsageLoading, setTokenUsageLoading] = useState(false)
  const [tokenUsageError, setTokenUsageError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([])
  const [testMessage, setTestMessage] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [systemStatusLoading, setSystemStatusLoading] = useState(false)

  const fetchTokenUsage = async () => {
    setTokenUsageLoading(true)
    setTokenUsageError(null)
    try {
      const response = await fetch('/api/tokens?action=all')
      if (!response.ok) {
        throw new Error('Failed to fetch token usage data')
      }
      const data: TokenUsageData = await response.json()
      setTokenUsageData(data)
    } catch (err) {
      setTokenUsageError(err instanceof Error ? err.message : 'Failed to fetch token usage data')
    } finally {
      setTokenUsageLoading(false)
    }
  }

  const resetTokenUsage = async () => {
    setTokenUsageLoading(true)
    setTokenUsageError(null)
    try {
      const response = await fetch('/api/tokens', { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Failed to reset token usage data')
      }
      setTokenUsageData(null)
      alert('Token usage data reset successfully!')
    } catch (err) {
      setTokenUsageError(err instanceof Error ? err.message : 'Failed to reset token usage data')
    } finally {
      setTokenUsageLoading(false)
    }
  }

  const testChatAPI = async () => {
    if (!testMessage.trim()) return
    
    setTestLoading(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: testMessage }],
          sessionId: `test_${Date.now()}`
        }),
      })

      const data = await response.json()
      setTestResult(data)
      
      // If there's debug info, add it to our debug list
      if (data.debug) {
        setDebugInfo(prev => [data.debug, ...prev.slice(0, 9)]) // Keep last 10
      }
      
    } catch (err) {
      setTestResult({ error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setTestLoading(false)
    }
  }

  const clearDebugInfo = () => {
    setDebugInfo([])
    setTestResult(null)
  }

  const fetchSystemStatus = async () => {
    setSystemStatusLoading(true)
    try {
      const response = await fetch('/api/test')
      if (!response.ok) {
        throw new Error('Failed to fetch system status')
      }
      const data = await response.json()
      setSystemStatus(data)
    } catch (err) {
      console.error('Failed to fetch system status:', err)
      setSystemStatus({ error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setSystemStatusLoading(false)
    }
  }

  const fetchChatLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/memory?userId=anonymous')
      if (!response.ok) {
        throw new Error('Failed to fetch chat logs')
      }
      const data: ApiResponse = await response.json()
      const logs = data.chatLogs || []
      setChatLogs(logs)
      setEnvironmentInfo(data.environment)
      setEnvironmentMessage(data.message)
      setDbConnectionStatus(data.dbConnectionStatus ?? null)
      
      // Group logs by session
      const sessionMap = new Map<string, ChatLog[]>()
      logs.forEach((log: ChatLog) => {
        if (!sessionMap.has(log.sessionId)) {
          sessionMap.set(log.sessionId, [])
        }
        sessionMap.get(log.sessionId)!.push(log)
      })
      
      // Create session objects
      const sessionArray: ConversationSession[] = Array.from(sessionMap.entries()).map(([sessionId, logs]) => {
        const sortedLogs = logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        const firstLog = sortedLogs[0]
        const lastLog = sortedLogs[sortedLogs.length - 1]
        
        // Extract user profile from the most recent log that has it
        // Create a copy for reverse iteration to avoid mutating the sorted array
        let userProfile: UserProfile | undefined = undefined
        const reversedCopy = [...sortedLogs].reverse()
        for (const log of reversedCopy) {
          if (log.metadata?.userProfile) {
            userProfile = log.metadata.userProfile
            break
          }
        }
        
        return {
          sessionId,
          logs: sortedLogs, // This maintains chronological order (oldest first)
          messageCount: logs.length,
          firstMessage: firstLog.content.substring(0, 50) + (firstLog.content.length > 50 ? '...' : ''),
          lastMessage: lastLog.content.substring(0, 50) + (lastLog.content.length > 50 ? '...' : ''),
          startTime: firstLog.timestamp,
          endTime: lastLog.timestamp,
          userProfile
        }
      })
      
      // Sort sessions by start time (newest first)
      sessionArray.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      setSessions(sessionArray)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chat logs')
    } finally {
      setLoading(false)
    }
  }

  const deleteChatLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/memory?userId=anonymous', { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Failed to delete chat logs')
      }
      setChatLogs([])
      setSessions([])
      setExpandedSessions(new Set())
      alert('All chat logs deleted successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chat logs')
    } finally {
      setLoading(false)
    }
  }

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  useEffect(() => {
    fetchChatLogs()
    fetchTokenUsage()
    fetchSystemStatus() // Fetch system status on mount
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Chat Logs Dashboard</h1>

        {/* Environment Info */}
        {environmentInfo && (
          <div className={`mb-6 p-4 rounded-lg ${
            environmentInfo.isVercel 
              ? 'bg-yellow-600 text-yellow-100' 
              : 'bg-green-600 text-green-100'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-semibold">
                {environmentInfo.isVercel ? '🚀 Vercel Environment' : '💻 Local Environment'}
              </span>
              <span className="text-sm opacity-75">
                Storage: {environmentInfo.storageType}
              </span>
            </div>
            <p className="text-sm opacity-90">{environmentMessage}</p>
            {environmentInfo.isVercel && (
              <div className="text-sm opacity-75 mt-2">
                {dbConnectionStatus === true ? (
                  <p className="text-green-300">
                    ✅ <strong>Database Connected:</strong> Logs are being stored persistently in the database.
                  </p>
                ) : dbConnectionStatus === false ? (
                  <p className="text-red-300">
                    ❌ <strong>Database Connection Failed:</strong> Logs may not be persisting. Check Vercel KV configuration.
                  </p>
                ) : (
                  <p>
                    🔄 <strong>Checking Database Connection...</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <button onClick={fetchChatLogs} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded mr-4">
            {loading ? 'Loading...' : 'Refresh Chat Logs'}
          </button>
          <button onClick={deleteChatLogs} disabled={loading} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded mr-4">
            {loading ? 'Deleting...' : 'Delete All Chat Logs'}
          </button>
          <button onClick={fetchTokenUsage} disabled={tokenUsageLoading} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded mr-4">
            {tokenUsageLoading ? 'Loading...' : 'Refresh Token Usage'}
          </button>
          <button onClick={resetTokenUsage} disabled={tokenUsageLoading} className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-4 py-2 rounded">
            {tokenUsageLoading ? 'Resetting...' : 'Reset Token Data'}
          </button>
        </div>

        {/* Debug Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            🐛 Debug Panel
          </h2>
          
          {/* Test Chat API */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Test Chat API</h3>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <button 
                onClick={testChatAPI} 
                disabled={testLoading || !testMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded"
              >
                {testLoading ? 'Testing...' : 'Test'}
              </button>
              <button 
                onClick={clearDebugInfo}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
              >
                Clear
              </button>
            </div>
            
            {testResult && (
              <div className="bg-gray-700 rounded p-4 mb-4">
                <h4 className="font-semibold mb-2">Test Result:</h4>
                <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Recent Debug Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Recent Debug Info ({debugInfo.length})</h3>
            {debugInfo.length === 0 ? (
              <p className="text-gray-400 text-sm">No debug information available. Test the chat API to see debug data.</p>
            ) : (
              <div className="space-y-2">
                {debugInfo.map((info, index) => (
                  <div key={index} className="bg-gray-700 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          info.errorType?.includes('ERROR') 
                            ? 'bg-red-600 text-red-100' 
                            : 'bg-green-600 text-green-100'
                        }`}>
                          {info.errorType || info.responseType || 'UNKNOWN'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {info.requestId}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {info.timestamp ? new Date(info.timestamp).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                    
                    {info.errorMessage && (
                      <div className="text-sm text-red-300 mb-1">
                        Error: {info.errorMessage}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 space-x-4">
                      {info.totalTime && (
                        <span>Total: {info.totalTime}ms</span>
                      )}
                      {info.responseTime && (
                        <span>Response: {info.responseTime}ms</span>
                      )}
                      {info.groqResponseTime && (
                        <span>Groq: {info.groqResponseTime}ms</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              🛠️ System Status
            </h2>
            <button 
              onClick={fetchSystemStatus} 
              disabled={systemStatusLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm"
            >
              {systemStatusLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          {systemStatusLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading system status...</p>
            </div>
          ) : systemStatus ? (
            <div className="space-y-4">
              {/* Environment */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">🌍 Environment</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">Node Env:</div>
                    <div className="text-lg font-bold text-green-400">
                      {systemStatus.environment?.NODE_ENV || 'Unknown'}
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">Platform:</div>
                    <div className="text-lg font-bold text-green-400">
                      {systemStatus.system?.platform || 'Unknown'}
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">Node Version:</div>
                    <div className="text-lg font-bold text-green-400">
                      {systemStatus.system?.nodeVersion || 'Unknown'}
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">Uptime:</div>
                    <div className="text-lg font-bold text-green-400">
                      {systemStatus.system?.uptime ? Math.floor(systemStatus.system.uptime / 60) + 'm' : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>

              {/* API Keys */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">🔑 API Keys</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">GROQ API Key:</div>
                    <div className={`text-lg font-bold ${
                      systemStatus.environment?.GROQ_API_KEY?.exists ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {systemStatus.environment?.GROQ_API_KEY?.exists ? 'Present' : 'Missing'}
                    </div>
                    {systemStatus.environment?.GROQ_API_KEY?.exists && (
                      <div className="text-xs text-gray-400 mt-1">
                        Length: {systemStatus.environment.GROQ_API_KEY.length} chars
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">Vercel Env:</div>
                    <div className="text-lg font-bold text-green-400">
                      {systemStatus.environment?.VERCEL_ENV || 'Local'}
                    </div>
                  </div>
                </div>
              </div>

              {/* File System */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">📁 File System</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">Knowledge Base:</div>
                    <div className={`text-lg font-bold ${
                      systemStatus.fileSystem?.knowledgeBase?.exists ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {systemStatus.fileSystem?.knowledgeBase?.exists ? 'Available' : 'Missing'}
                    </div>
                    {systemStatus.fileSystem?.knowledgeBase?.exists && (
                      <div className="text-xs text-gray-400 mt-1">
                        Size: {systemStatus.fileSystem.knowledgeBase.size} bytes
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">Response Time:</div>
                    <div className="text-lg font-bold text-green-400">
                      {systemStatus.responseTime}ms
                    </div>
                  </div>
                </div>
              </div>

              {/* Groq API Test */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">🤖 Groq API</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">Connection:</div>
                    <div className={`text-lg font-bold ${
                      systemStatus.groqApi?.success ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {systemStatus.groqApi?.success ? 'Connected' : 'Failed'}
                    </div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm text-gray-300">Response Time:</div>
                    <div className="text-lg font-bold text-green-400">
                      {systemStatus.groqApi?.responseTime || 'N/A'}ms
                    </div>
                  </div>
                </div>
                {systemStatus.groqApi?.error && (
                  <div className="mt-2 text-sm text-red-300">
                    Error: {systemStatus.groqApi.error}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">System status not available.</p>
              <p className="text-sm text-gray-500">
                Click "Refresh" to check system status.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-600 text-white p-4 rounded mb-6">
            Error: {error}
          </div>
        )}

        {tokenUsageError && (
          <div className="bg-red-600 text-white p-4 rounded mb-6">
            Token Usage Error: {tokenUsageError}
          </div>
        )}

        {/* Token Usage Dashboard */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            📊 Daily Token Usage Tracker
          </h2>

          {tokenUsageLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading token usage data...</p>
            </div>
          ) : tokenUsageData ? (
            <div className="space-y-6">
              {/* Today's Usage */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">📅 Today's Usage</h3>
                {tokenUsageData.todayUsage ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-600 rounded p-3">
                      <div className="text-2xl font-bold text-green-400">
                        {tokenUsageData.todayUsage.totalTokens.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-300">Total Tokens</div>
                    </div>
                    <div className="bg-gray-600 rounded p-3">
                      <div className="text-2xl font-bold text-blue-400">
                        {tokenUsageData.todayUsage.requestCount}
                      </div>
                      <div className="text-sm text-gray-300">Requests</div>
                    </div>
                    <div className="bg-gray-600 rounded p-3">
                      <div className="text-2xl font-bold text-purple-400">
                        {tokenUsageData.todayUsage.uniqueUsers}
                      </div>
                      <div className="text-sm text-gray-300">Users</div>
                    </div>
                    <div className="bg-gray-600 rounded p-3">
                      <div className="text-2xl font-bold text-yellow-400">
                        {tokenUsageData.todayUsage.uniqueSessions}
                      </div>
                      <div className="text-sm text-gray-300">Sessions</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400">No token usage recorded today yet.</p>
                  </div>
                )}
              </div>

              {/* 7-Day History */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">📈 7-Day History</h3>
                <div className="space-y-2">
                  {tokenUsageData.history.map((day, index) => (
                    <div key={day.date} className="flex items-center justify-between py-2 px-3 bg-gray-600 rounded">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-xs text-gray-400">
                          {index === 0 ? '(today)' : index === 1 ? '(yesterday)' : ''}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-green-400 font-medium">
                          {day.totalTokens.toLocaleString()} tokens
                        </div>
                        <div className="text-blue-400">
                          {day.requestCount} requests
                        </div>
                        <div className="text-purple-400">
                          {day.uniqueUsers} users
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">📊 All-Time Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-xl font-bold text-green-400">
                      {tokenUsageData.stats.totalTokensAllTime.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-300">Total Tokens</div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-xl font-bold text-blue-400">
                      {tokenUsageData.stats.totalRequests}
                    </div>
                    <div className="text-xs text-gray-300">Total Requests</div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-xl font-bold text-yellow-400">
                      {tokenUsageData.stats.avgTokensPerRequest}
                    </div>
                    <div className="text-xs text-gray-300">Avg per Request</div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-xl font-bold text-purple-400">
                      {tokenUsageData.stats.daysTracked}
                    </div>
                    <div className="text-xs text-gray-300">Days Tracked</div>
                  </div>
                  <div className="bg-gray-600 rounded p-3">
                    <div className="text-sm font-bold text-orange-400">
                      {tokenUsageData.stats.mostActiveDate 
                        ? new Date(tokenUsageData.stats.mostActiveDate).toLocaleDateString()
                        : 'N/A'
                      }
                    </div>
                    <div className="text-xs text-gray-300">Most Active Day</div>
                  </div>
                </div>
              </div>

              {/* Environment Info */}
              <div className="text-xs text-gray-400 text-center">
                Storage: {tokenUsageData.environment.storageType} • 
                Last updated: {new Date(tokenUsageData.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No token usage data available.</p>
              <p className="text-sm text-gray-500">
                Start a conversation with the AI to begin tracking token usage.
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Conversation Sessions ({sessions.length})
          </h2>

          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No conversations found. Try chatting with the AI first!</p>
              {environmentInfo?.isVercel && (
                <p className="text-sm text-gray-500">
                  💡 On Vercel, logs are stored in-memory and will reset between deployments.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.sessionId} className="bg-gray-700 rounded-lg overflow-hidden">
                  {/* Session Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => toggleSession(session.sessionId)}
                  >
                    {/* User Profile Information */}
                    <div className="mb-3 p-3 bg-gray-600 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-blue-400 font-semibold">👤 User Information</span>
                      </div>
                      {session.userProfile ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400">Name:</span>
                              <span className="text-white">
                                {session.userProfile.name || <span className="text-gray-500 italic">Not provided</span>}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400">Email:</span>
                              <span className="text-white">
                                {session.userProfile.email || <span className="text-gray-500 italic">Not provided</span>}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400">Phone:</span>
                              <span className="text-white">
                                {session.userProfile.phone || <span className="text-gray-500 italic">Not provided</span>}
                              </span>
                            </div>
                          </div>
                          {/* Completion indicator */}
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-xs text-gray-400">Profile completion:</span>
                            <div className="flex space-x-1">
                              <div className={`w-2 h-2 rounded-full ${session.userProfile.name ? 'bg-green-500' : 'bg-gray-500'}`} title="Name"></div>
                              <div className={`w-2 h-2 rounded-full ${session.userProfile.email ? 'bg-green-500' : 'bg-gray-500'}`} title="Email"></div>
                              <div className={`w-2 h-2 rounded-full ${session.userProfile.phone ? 'bg-green-500' : 'bg-gray-500'}`} title="Phone"></div>
                            </div>
                            <span className="text-xs text-gray-400">
                              ({[session.userProfile.name, session.userProfile.email, session.userProfile.phone].filter(Boolean).length}/3)
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400 italic">
                          No user information collected in this session
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-400">
                            Session: {session.sessionId.slice(-8)}
                          </span>
                          <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                            {session.messageCount} messages
                          </span>
                        </div>
                        <div className="mt-2">
                          <p className="text-white text-sm">
                            <span className="text-gray-400">First:</span> {session.firstMessage}
                          </p>
                          <p className="text-white text-sm">
                            <span className="text-gray-400">Last:</span> {session.lastMessage}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-400">
                            {new Date(session.startTime).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(session.startTime).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-gray-400">
                          {expandedSessions.has(session.sessionId) ? '▼' : '▶'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Messages */}
                  {expandedSessions.has(session.sessionId) && (
                    <div className="border-t border-gray-600 bg-gray-750">
                      <div className="p-4 space-y-3">
                        {session.logs.map((log) => (
                          <div key={log.id} className="flex space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              log.role === 'user' ? 'bg-blue-600' : 'bg-green-600'
                            }`}>
                              {log.role === 'user' ? '👤' : '🤖'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs text-gray-400">
                                  {log.role === 'user' ? 'User' : 'AI Assistant'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="bg-gray-800 rounded p-3">
                                <p className="text-white text-sm whitespace-pre-wrap">{log.content}</p>
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <div className="mt-2 text-xs text-gray-400">
                                    <details>
                                      <summary className="cursor-pointer hover:text-gray-300">
                                        Metadata
                                      </summary>
                                      <pre className="mt-1 text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                                        {JSON.stringify(log.metadata, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Go to the main chat page and have a conversation with the AI</li>
            <li>Come back to this page and click "Refresh Chat Logs"</li>
            <li>Click on any session to expand and view the full conversation</li>
            <li>Each session shows the complete back-and-forth between you and the AI</li>
            <li>Use the delete button to clear all logs when testing</li>
            {environmentInfo?.isVercel && (
              <li className="text-yellow-400">
                ⚠️ <strong>Vercel Note:</strong> Logs are stored in-memory and will reset between deployments
              </li>
            )}
          </ol>
        </div>
      </div>
    </div>
  )
} 