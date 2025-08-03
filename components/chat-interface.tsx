'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { MessageCircle, Send, Loader2, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { TypeAnimation } from 'react-type-animation'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// Component to handle typing animation for bot messages
interface TypedBotMessageProps {
  content: string
  isLightMode: boolean
  onComplete?: () => void
  LinkComponent: React.ComponentType<React.AnchorHTMLAttributes<HTMLAnchorElement>>
  convertUrlsToMarkdown: (text: string) => string
}

function TypedBotMessage({ content, isLightMode, onComplete, LinkComponent, convertUrlsToMarkdown }: TypedBotMessageProps) {
  const handleTypingComplete = () => {
    onComplete?.()
  }

  // ONLY use TypeAnimation - NEVER switch to anything else
  return (
    <div className="max-w-none">
      <TypeAnimation
        sequence={[content, handleTypingComplete]}
        wrapper="div"
        speed={75}
        style={{ 
          whiteSpace: 'pre-wrap',
          color: 'inherit',
          fontSize: 'inherit',
          fontFamily: 'inherit'
        }}
        cursor={false}
      />
    </div>
  )
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLightMode, setIsLightMode] = useState(false)
  // Add persistent session ID
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [lastError, setLastError] = useState<any>(null)
  const [hasFirstMessage, setHasFirstMessage] = useState(false)
  
  // State for transforming loading message
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null)
  
  // Reset animation states when starting fresh
  useEffect(() => {
    if (messages.length === 0) {
      setHasFirstMessage(false)
    }
  }, [messages.length])

  // Add chat-page class to body on mount, remove on unmount
  useEffect(() => {
    document.body.classList.add('chat-page')
    return () => {
      document.body.classList.remove('chat-page')
    }
  }, [])
  
  const cardRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialGifRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)


  // Function to convert plain text URLs to markdown links
  const convertUrlsToMarkdown = (text: string): string => {
    // URL regex pattern - more robust to handle various URL formats
    const urlRegex = /(https?:\/\/[^\s\)]+)/g
    return text.replace(urlRegex, '[$1]($1)')
  }

  // Custom link component for ReactMarkdown
  const LinkComponent = ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (!href) return <>{children}</>
    
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 underline transition-colors duration-200 ${
          isLightMode 
            ? 'text-blue-600 hover:text-blue-500' 
            : 'text-blue-400 hover:text-blue-300'
        }`}
        {...props}
      >
        {children}
        <ExternalLink className="w-3 h-3" />
      </a>
    )
  }

  // Simple auto-scroll to bottom when new messages are added
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container') as HTMLElement
    if (messagesContainer) {
      // Simple, direct scroll to bottom with a small buffer to ensure full visibility
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight + 50
      }, 100)
    }
  }, [messages])

  // Keep input focused after messages are sent and responses are received
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      // Small delay to ensure the component has finished updating
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }, [isLoading])

  // Pointer tracking for glowing effect
  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const cardUpdate = (e: PointerEvent) => {
      const position = pointerPositionRelativeToElement(card, e)
      const [px, py] = position.pixels
      const [perx, pery] = position.percent
      const [dx, dy] = distanceFromCenter(card, px, py)
      const edge = closenessToEdge(card, px, py)
      const angle = angleFromPointerEvent(card, dx, dy)

      card.style.setProperty('--pointer-x', `${round(perx)}%`)
      card.style.setProperty('--pointer-y', `${round(pery)}%`)
      card.style.setProperty('--pointer-°', `${round(angle)}deg`)
      card.style.setProperty('--pointer-d', `${round(edge * 100)}`)
      
      card.classList.remove('animating')
    }

    card.addEventListener("pointermove", cardUpdate)
    return () => card.removeEventListener("pointermove", cardUpdate)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const messageText = input.trim()
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText
    }

    // Clear input immediately regardless of which path we take
    setInput('')
    
    // Also force clear the input element directly
    if (inputRef.current) {
      inputRef.current.value = ''
    }

    // Refocus the input after clearing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)

    // Create a loading message
    const loadingId = (Date.now() + 1).toString()
    const loadingMessage: Message = {
      id: loadingId,
      role: 'assistant',
      content: 'loading' // Special content to indicate loading
    }

    // Handle first message animation
    if (messages.length === 0) {
      // Simplified first message animation - no complex morphing
      setHasFirstMessage(true)
      
      // Add both messages with a simple delay to avoid layout shifts
      setTimeout(() => {
        setMessages(prev => [...prev, userMessage, loadingMessage])
        setLoadingMessageId(loadingId)
      }, 400) // Single, shorter delay
    } else {
      // For subsequent messages, add both in correct order
      setMessages(prev => [...prev, userMessage, loadingMessage])
      setLoadingMessageId(loadingId)
    }

    setIsLoading(true)
    setLastError(null) // Clear previous errors

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sessionId: sessionId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Chat API error response:', errorData)
        setLastError(errorData)
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      
      // Transform the loading message into the response INSTANTLY
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
          ? { ...msg, content: data.message }
          : msg
      ))
      setLoadingMessageId(null)

    } catch (error) {
      console.error('Chat error:', error)
      // Transform the loading message into an error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
          : msg
      ))
      setLoadingMessageId(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuestion = async (question: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question
    }

    // Ensure input is focused when using quick questions
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)

    // Create a loading message
    const loadingId = (Date.now() + 1).toString()
    const loadingMessage: Message = {
      id: loadingId,
      role: 'assistant',
      content: 'loading' // Special content to indicate loading
    }

    // Handle first message animation for quick questions
    if (messages.length === 0) {
      // Simplified first message animation - no complex morphing
      setHasFirstMessage(true)
      
      // Add both messages with a simple delay to avoid layout shifts
      setTimeout(() => {
        setMessages(prev => [...prev, userMessage, loadingMessage])
        setLoadingMessageId(loadingId)
      }, 400) // Single, shorter delay
    } else {
      // For subsequent messages, add both in correct order
      setMessages(prev => [...prev, userMessage, loadingMessage])
      setLoadingMessageId(loadingId)
    }

    setIsLoading(true)
    setLastError(null) // Clear previous errors

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sessionId: sessionId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Chat API error response:', errorData)
        setLastError(errorData)
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      
      // Transform the loading message into the response INSTANTLY
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
          ? { ...msg, content: data.message }
          : msg
      ))
      setLoadingMessageId(null)

    } catch (error) {
      console.error('Chat error:', error)
      // Transform the loading message into an error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
          : msg
      ))
      setLoadingMessageId(null)
    } finally {
      setIsLoading(false)
    }
  }

  const quickQuestions = [
    "Do you build websites?",
    "How much for a logo?",
    "What is Clubhaus?",
    "Can you help me with a design?"
  ]

  const toggleTheme = () => {
    setIsLightMode(!isLightMode)
    document.body.classList.toggle('light')
  }

  return (
    <div className="chat-page-container flex items-center justify-center p-4">
      <div className="glow-card" ref={cardRef}>
        <span className="glow"></span>
        <div className="inner">
          <header style={{ zIndex: 10 }}>
            <svg className="sun" viewBox="0 0 24 24" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
              <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </g>
            </svg>
            <h2 className="glow-text">Clubhaus AI</h2>
          </header>
          
          <div className="content" style={{ zIndex: 50 }}>
            {/* Animated GIF with Framer Motion - Simplified */}
            <AnimatePresence>
              {(messages.length === 0 || hasFirstMessage) && (
                <motion.div 
                  ref={initialGifRef}
                  className="relative"
                  style={{ 
                    zIndex: 100,
                    opacity: 1,
                    pointerEvents: 'none'
                  }}
                  initial={messages.length === 0 ? {
                    width: '8rem',
                    height: '8rem',
                    margin: '0 auto 1rem',
                    position: 'relative',
                    opacity: 0,
                    scale: 0.9
                  } : false}
                  animate={hasFirstMessage ? {
                    position: 'fixed',
                    top: '0px',
                    right: '3px',
                    width: '3rem',
                    height: '3rem',
                    margin: 0,
                    opacity: 1,
                    scale: 1
                  } : {
                    width: '8rem',
                    height: '8rem',
                    margin: '0 auto 1rem',
                    position: 'relative',
                    opacity: 1,
                    scale: 1
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                >
                  {/* Single GIF layer - no blur effects */}
                  <motion.img 
                    src="/gifs/Small-Transparent-messeger-app-Chip.gif" 
                    alt="Clubhaus AI Assistant" 
                    className="w-full h-full object-contain"
                    whileHover={{ scale: 1.05 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="messages-container">
              {messages.length === 0 ? (
                <motion.div 
                  className="text-center py-8" 
                  style={{ paddingTop: '9rem' }}
                  animate={{
                    opacity: hasFirstMessage ? 0 : 1,
                    y: hasFirstMessage ? -20 : 0
                  }}
                  transition={{
                    duration: 0.4,
                    ease: "easeOut"
                  }}
                >
                  <motion.p 
                    className={`mb-6 ${isLightMode ? 'text-blue-900/80' : 'text-white/80'}`}
                  >
                    A Clubhaus AI built to talk with you about your project or our business. Whether you're here to build something bold or just exploring, I'm here to help.
                  </motion.p>
                  
                  <motion.div 
                    className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto"
                  >
                    {quickQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleQuickQuestion(question)}
                        disabled={hasFirstMessage}
                        className={`text-left p-3 h-auto text-sm justify-start bg-transparent transition-all duration-200 ${
                          isLightMode 
                            ? 'border-blue-900/20 text-blue-900/80 hover:bg-blue-900/10 hover:text-blue-900/90 hover:border-blue-900/40 hover:shadow-[0_0_5px_rgba(59,130,246,0.2)]'
                            : 'border-white/20 text-white/80 hover:bg-white/10 hover:text-white/90 hover:border-white/40 hover:shadow-[0_0_5px_rgba(59,130,246,0.2)]'
                        }`}
                      >
                        {question}
                      </Button>
                    ))}
                  </motion.div>
                </motion.div>
              ) : (
                <div className="messages-list">
                  <AnimatePresence>
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.1,
                          ease: "easeOut"
                        }}
                      >
                        <motion.div
                          className={`max-w-xs lg:max-w-2xl rounded-lg ${
                            message.role === 'assistant' ? '' : 'transition-all duration-500'
                          } ${
                            message.content === 'loading'
                              ? 'processing-message-box'
                              : message.role === 'user'
                                ? isLightMode 
                                  ? 'bg-blue-900/20 text-blue-900 border border-blue-900/30 px-4 py-3'
                                  : 'bg-white/20 text-white border border-white/30 px-4 py-3'
                                : isLightMode
                                  ? 'bg-blue-900/10 text-blue-900/90 border border-blue-900/20 px-4 py-3'
                                  : 'bg-white/10 text-white/90 border border-white/20 px-4 py-3'
                          }`}
                          initial={message.id === loadingMessageId && message.content !== 'loading' && message.role === 'user' ? { 
                            opacity: 0, 
                            scale: 0.98
                          } : false}
                          animate={message.role === 'assistant' ? false : { 
                            opacity: 1, 
                            scale: 1
                          }}
                          transition={message.role === 'assistant' ? { duration: 0 } : {
                            duration: 0.5,
                            ease: "easeOut",
                            delay: message.id === loadingMessageId && message.content !== 'loading' && message.role === 'user' ? 0.3 : 0
                          }}
                        >
                          {message.content === 'loading' ? (
                            <div className={`inner-content ${
                              isLightMode 
                                ? 'bg-blue-900/10'
                                : 'bg-white/10'
                            }`} style={{ 
                              backgroundColor: isLightMode 
                                ? 'hsl(260, 25%, 95%)' 
                                : 'hsl(222.2, 84%, 4.9%)'
                            }}>
                              <div className="max-w-none">
                                <span style={{ 
                                  whiteSpace: 'pre-wrap',
                                  color: isLightMode ? '#1e3a8a' : '#ffffff',
                                  fontSize: 'inherit',
                                  fontFamily: 'inherit',
                                  fontWeight: '100',
                                  position: 'relative',
                                  zIndex: 10,
                                  letterSpacing: '0.1em'
                                }}>Strategizing...</span>
                              </div>
                            </div>
                          ) : message.role === 'assistant' ? (
                            <TypedBotMessage
                              content={message.content}
                              isLightMode={isLightMode}
                              onComplete={() => {
                                // This onComplete is for the TypedBotMessage component itself,
                                // not the overall message animation.
                                // The overall message animation is handled by the AnimatePresence
                                // and the message's own transition.
                              }}
                              LinkComponent={LinkComponent}
                              convertUrlsToMarkdown={convertUrlsToMarkdown}
                            />
                          ) : (
                            <div className="max-w-none">
                              <ReactMarkdown components={{ a: LinkComponent }}>{convertUrlsToMarkdown(message.content)}</ReactMarkdown>
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Form - Now pinned to bottom */}
            <div className="input-container">
              <div className="cyberpunk-form">
                <form onSubmit={handleSubmit} className="flex">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me about Clubhaus..."
                    disabled={isLoading}
                    className="cyberpunk-input"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="cyberpunk-button"
                  >
                    {isLoading ? (
                      <div className="relative">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ zIndex: 1000 }} />
                      </div>
                    ) : (
                      <Send className="w-4 h-4 mx-auto" />
                    )}
                  </button>
                </form>
              </div>
              <p className={`text-xs mt-2 text-center ${
                isLightMode ? 'text-blue-900/50' : 'text-white/50'
              }`}>
                Powered by Clubhaus Agency's Knowledge bank
              </p>
              
              {/* Error Display */}
              {lastError && (
                <div className={`mt-2 p-2 rounded text-xs text-center ${
                  isLightMode 
                    ? 'bg-red-100 text-red-800 border border-red-200' 
                    : 'bg-red-900/20 text-red-300 border border-red-700/30'
                }`}>
                  <p>An error occurred. Check the debug panel for details.</p>
                  <a 
                    href="/test-memory" 
                    className={`underline hover:no-underline ${
                      isLightMode ? 'text-red-700' : 'text-red-400'
                    }`}
                  >
                    View Debug Info →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Utility functions for pointer tracking
const centerOfElement = ($el: HTMLElement) => {
  const { width, height } = $el.getBoundingClientRect()
  return [width/2, height/2]
}

const pointerPositionRelativeToElement = ($el: HTMLElement, e: PointerEvent) => {
  const pos = [e.clientX, e.clientY]
  const { left, top, width, height } = $el.getBoundingClientRect()
  const x = pos[0] - left
  const y = pos[1] - top
  const px = clamp((100 / width) * x)
  const py = clamp((100 / height) * y)
  return { pixels: [x,y], percent: [px,py] }
}

const angleFromPointerEvent = ($el: HTMLElement, dx: number, dy: number) => {
  let angleRadians = 0
  let angleDegrees = 0
  if (dx !== 0 || dy !== 0) {
    angleRadians = Math.atan2(dy, dx)
    angleDegrees = angleRadians * (180 / Math.PI) + 90
    if (angleDegrees < 0) {
      angleDegrees += 360
    }
  }
  return angleDegrees
}

const distanceFromCenter = ($card: HTMLElement, x: number, y: number) => {
  const [cx,cy] = centerOfElement($card)
  return [x - cx, y - cy]
}

const closenessToEdge = ($card: HTMLElement, x: number, y: number) => {
  const [cx,cy] = centerOfElement($card)
  const [dx,dy] = distanceFromCenter($card, x, y)
  let k_x = Infinity
  let k_y = Infinity
  if (dx !== 0) {
    k_x = cx / Math.abs(dx)
  }    
  if (dy !== 0) {
    k_y = cy / Math.abs(dy)
  }
  return clamp((1 / Math.min(k_x, k_y)), 0, 1)
}

const round = (value: number, precision = 3) => parseFloat(value.toFixed(precision))

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(Math.max(value, min), max) 