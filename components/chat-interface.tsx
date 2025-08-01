'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Send, Loader2, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLightMode, setIsLightMode] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)



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

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // More robust scroll system with multiple fallbacks
  useEffect(() => {
    const scrollToBottomWithFallbacks = () => {
      const messagesContainer = document.querySelector('.messages-container') as HTMLElement
      if (!messagesContainer) return

      // Method 1: Direct scroll to bottom
      const scrollToBottom = () => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }

      // Method 2: Use scrollIntoView on the last message
      const scrollToLastMessage = () => {
        const lastMessage = messagesContainer.querySelector('.messages-list > div:last-child')
        if (lastMessage) {
          lastMessage.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end' 
          })
        }
      }

      // Method 3: Use the messagesEndRef
      const scrollToEndRef = () => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        })
      }

      // Method 4: Force scroll with timeout
      const forceScroll = () => {
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }, 10)
      }

      // Execute all methods with delays to ensure DOM updates
      scrollToBottom()
      forceScroll()
      
      // Use requestAnimationFrame for smooth execution
      requestAnimationFrame(() => {
        scrollToLastMessage()
        
        // Additional delay for dynamic content
        setTimeout(() => {
          scrollToEndRef()
          scrollToBottom() // Final fallback
          forceScroll() // Extra force
        }, 50)
      })
    }

    // Execute immediately
    scrollToBottomWithFallbacks()
    
    // Execute again after a short delay to handle any dynamic content
    setTimeout(scrollToBottomWithFallbacks, 100)
    
    // Execute one more time after a longer delay for any async content
    setTimeout(scrollToBottomWithFallbacks, 300)
    
    // Final execution after content is fully rendered
    setTimeout(scrollToBottomWithFallbacks, 500)
  }, [messages, isLoading])

  // Additional scroll effect for better UX
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container')
    if (messagesContainer && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      })
    }
  }, [messages, isLoading])

  // Ensure scroll to bottom on initial load and when messages change
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container')
    if (messagesContainer) {
      const scrollToBottom = () => {
        // Account for the input container height when scrolling
        const inputContainer = document.querySelector('.input-container') as HTMLElement
        const inputHeight = inputContainer ? inputContainer.offsetHeight : 120
        messagesContainer.scrollTop = messagesContainer.scrollHeight - inputHeight
      }
      
      // Immediate scroll
      scrollToBottom()
      
      // Delayed scroll to handle any dynamic content
      setTimeout(scrollToBottom, 100)
    }
  }, [messages, isLoading])

  // Mutation observer to watch for DOM changes
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container')
    if (!messagesContainer) return

    const observer = new MutationObserver(() => {
      // Force scroll to bottom whenever DOM changes
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      })
    })

    observer.observe(messagesContainer, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => observer.disconnect()
  }, [])

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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages(prev => [...prev, errorMessage])
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

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages(prev => [...prev, errorMessage])
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glow-card" ref={cardRef}>
        <span className="glow"></span>
        <div className="inner">
          <header>
            <svg className="sun" viewBox="0 0 24 24" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
              <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </g>
            </svg>
            <h2 className="glow-text" data-text="Clubhaus AI">Clubhaus AI</h2>
            <img 
              src="/logo192.png" 
              alt="Clubhaus Logo" 
              className="w-6 h-6 object-contain opacity-70"
              style={{ cursor: 'pointer' }}
            />
          </header>
          
          {/* SVG Filters for Glow Effect */}
          <svg className="glow-text-filters" width='1440px' height='300px' viewBox='0 0 1440 300' xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
            <defs>
              <filter id="glow-4" colorInterpolationFilters="sRGB" x="-50%" y="-200%" width="200%" height="500%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur4"/>
                <feGaussianBlur in="SourceGraphic" stdDeviation="19" result="blur19"/>
                <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur9"/>
                <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="blur30"/>
                <feColorMatrix in="blur4" result="color-0-blur" type="matrix" values="1 0 0 0 0
                          0 0.9803921568627451 0 0 0
                          0 0 0.9647058823529412 0 0
                          0 0 0 0.8 0"/>
                <feOffset in="color-0-blur" result="layer-0-offsetted" dx="0" dy="0"/>
                <feColorMatrix in="blur19" result="color-1-blur" type="matrix" values="0.8156862745098039 0 0 0 0
                          0 0.49411764705882355 0 0 0
                          0 0 0.2627450980392157 0 0
                          0 0 0 1 0"/>
                <feOffset in="color-1-blur" result="layer-1-offsetted" dx="0" dy="2"/>
                <feColorMatrix in="blur9" result="color-2-blur" type="matrix" values="1 0 0 0 0
                          0 0.6666666666666666 0 0 0
                          0 0 0.36470588235294116 0 0
                          0 0 0 0.65 0"/>
                <feOffset in="color-2-blur" result="layer-2-offsetted" dx="0" dy="2"/>
                <feColorMatrix in="blur30" result="color-3-blur" type="matrix" values="1 0 0 0 0
                          0 0.611764705882353 0 0 0
                          0 0 0.39215686274509803 0 0
                          0 0 0 1 0"/>
                <feOffset in="color-3-blur" result="layer-3-offsetted" dx="0" dy="2"/>
                <feColorMatrix in="blur30" result="color-4-blur" type="matrix" values="0.4549019607843137 0 0 0 0
                          0 0.16470588235294117 0 0 0
                          0 0 0 0 0
                          0 0 0 1 0"/>
                <feOffset in="color-4-blur" result="layer-4-offsetted" dx="0" dy="16"/>
                <feColorMatrix in="blur30" result="color-5-blur" type="matrix" values="0.4235294117647059 0 0 0 0
                          0 0.19607843137254902 0 0 0
                          0 0 0.11372549019607843 0 0
                          0 0 0 1 0"/>
                <feOffset in="color-5-blur" result="layer-5-offsetted" dx="0" dy="64"/>
                <feColorMatrix in="blur30" result="color-6-blur" type="matrix" values="0.21176470588235294 0 0 0 0
                          0 0.10980392156862745 0 0 0
                          0 0 0.07450980392156863 0 0
                          0 0 0 1 0"/>
                <feOffset in="color-6-blur" result="layer-6-offsetted" dx="0" dy="64"/>
                <feColorMatrix in="blur30" result="color-7-blur" type="matrix" values="0 0 0 0 0
                          0 0 0 0 0
                          0 0 0 0 0
                          0 0 0 0.68 0"/>
                <feOffset in="color-7-blur" result="layer-7-offsetted" dx="0" dy="64"/>
                <feMerge>
                  <feMergeNode in="layer-0-offsetted"/>
                  <feMergeNode in="layer-1-offsetted"/>
                  <feMergeNode in="layer-2-offsetted"/>
                  <feMergeNode in="layer-3-offsetted"/>
                  <feMergeNode in="layer-4-offsetted"/>
                  <feMergeNode in="layer-5-offsetted"/>
                  <feMergeNode in="layer-6-offsetted"/>
                  <feMergeNode in="layer-7-offsetted"/>
                  <feMergeNode in="layer-0-offsetted"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>
          
          <div className="content">
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4">
                    <img 
                      src="/gifs/Small-Transparent-messeger-app-Chip.gif" 
                      alt="Clubman AI Assistant" 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <p className={`mb-6 ${isLightMode ? 'text-blue-900/80' : 'text-white/80'}`}>
                    A Clubhaus AI built to talk with you about your project or our business. Whether you're here to build something bold or just exploring, I'm here to help.
                  </p>
                  <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                    {quickQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleQuickQuestion(question)}
                        className={`text-left p-3 h-auto text-sm justify-start bg-transparent transition-all duration-200 ${
                          isLightMode 
                            ? 'border-blue-900/20 text-blue-900/80 hover:bg-blue-900/10 hover:text-blue-900/90 hover:border-blue-900/40 hover:shadow-[0_0_5px_rgba(59,130,246,0.2)]'
                            : 'border-white/20 text-white/80 hover:bg-white/10 hover:text-white/90 hover:border-white/40 hover:shadow-[0_0_5px_rgba(59,130,246,0.2)]'
                        }`}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                          message.role === 'user'
                            ? isLightMode 
                              ? 'bg-blue-900/20 text-blue-900 border border-blue-900/30'
                              : 'bg-white/20 text-white border border-white/30'
                            : isLightMode
                              ? 'bg-blue-900/10 text-blue-900/90 border border-blue-900/20'
                              : 'bg-white/10 text-white/90 border border-white/20'
                        }`}
                      >
                        <div className="max-w-none">
                          <ReactMarkdown components={{ a: LinkComponent }}>{convertUrlsToMarkdown(message.content)}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg border ${
                        isLightMode 
                          ? 'bg-blue-900/10 border-blue-900/20'
                          : 'bg-white/10 border-white/20'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Loader2 className={`w-4 h-4 animate-spin ${
                            isLightMode ? 'text-blue-900/70' : 'text-white/70'
                          }`} />
                          <span className={`text-sm ${
                            isLightMode ? 'text-blue-900/70' : 'text-white/70'
                          }`}>Strategizing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Form - Now pinned to bottom */}
            <div className="input-container">
              <div className="cyberpunk-form">
                <form onSubmit={handleSubmit} className="flex">
                  <input
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
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
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