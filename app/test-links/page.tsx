'use client'

import { ChatInterface } from '@/components/chat-interface'

export default function TestLinksPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-4">
        <h1 className="text-white text-2xl mb-4">Link Test Page</h1>
        <p className="text-white mb-4">
          This page tests if links in AI responses are rendered as clickable elements.
        </p>
        <ChatInterface />
      </div>
    </div>
  )
} 