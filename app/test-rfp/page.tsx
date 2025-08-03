'use client'

import { useState } from 'react'

export default function TestRFPPage() {
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage = { role: 'user' as const, content: inputValue }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sessionId: 'test-rfp-session'
        }),
      })

      const data = await response.json()
      
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error processing your message.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const testRFPFlow = () => {
    const testMessages = [
      "I need help with an RFP",
      "My name is John Smith, john@example.com, 555-123-4567",
      "We need a new website",
      "ASAP",
      "Under $10k",
      "Increase sales and improve user experience",
      "Keep it conversational"
    ]

    let currentIndex = 0
    const sendNextMessage = () => {
      if (currentIndex < testMessages.length) {
        setInputValue(testMessages[currentIndex])
        setTimeout(() => {
          sendMessage()
          currentIndex++
          setTimeout(sendNextMessage, 1000)
        }, 500)
      }
    }

    sendNextMessage()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">RFP Flow Test</h1>
          
          <div className="mb-4">
            <button
              onClick={testRFPFlow}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test RFP Flow
            </button>
          </div>

          <div className="border rounded-lg p-4 mb-4 h-96 overflow-y-auto bg-gray-50">
            {messages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-800 border'
                }`}>
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left">
                <div className="inline-block p-3 rounded-lg bg-gray-200 text-gray-600">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 