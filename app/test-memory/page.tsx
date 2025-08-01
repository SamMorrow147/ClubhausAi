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

interface ConversationSession {
  sessionId: string
  logs: ChatLog[]
  messageCount: number
  firstMessage: string
  lastMessage: string
  startTime: string
  endTime: string
}

interface EnvironmentInfo {
  isVercel: boolean
  storageType: string
}

interface ApiResponse {
  chatLogs: ChatLog[]
  count: number
  userId: string
  environment: EnvironmentInfo
  message: string
}

export default function TestMemoryPage() {
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([])
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null)
  const [environmentMessage, setEnvironmentMessage] = useState<string>('')

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
        
        return {
          sessionId,
          logs: sortedLogs,
          messageCount: logs.length,
          firstMessage: firstLog.content.substring(0, 50) + (firstLog.content.length > 50 ? '...' : ''),
          lastMessage: lastLog.content.substring(0, 50) + (lastLog.content.length > 50 ? '...' : ''),
          startTime: firstLog.timestamp,
          endTime: lastLog.timestamp
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
              <p className="text-sm opacity-75 mt-2">
                💡 <strong>Note:</strong> On Vercel, logs are stored in-memory and will reset between deployments. 
                For persistent logging, consider using a database service.
              </p>
            )}
          </div>
        )}

        <div className="mb-6">
          <button onClick={fetchChatLogs} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded mr-4">
            {loading ? 'Loading...' : 'Refresh Chat Logs'}
          </button>
          <button onClick={deleteChatLogs} disabled={loading} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded">
            {loading ? 'Deleting...' : 'Delete All Chat Logs'}
          </button>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-4 rounded mb-6">
            Error: {error}
          </div>
        )}

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