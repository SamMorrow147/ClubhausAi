'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  // Add persistent session ID
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [lastError, setLastError] = useState<any>(null)
  const [hasFirstMessage, setHasFirstMessage] = useState(false)
  
  // State for transforming loading message
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null)
  const [isTransforming, setIsTransforming] = useState(false)
  
  // Animation states for first message
  const [isAnimatingFirstMessage, setIsAnimatingFirstMessage] = useState(false)
  const [animatingMessageText, setAnimatingMessageText] = useState('')
  const [showStaticMessages, setShowStaticMessages] = useState(false)
  
  // Reset animation states when starting fresh
  useEffect(() => {
    if (messages.length === 0) {
      setIsAnimatingFirstMessage(false)
      setAnimatingMessageText('')
      setShowStaticMessages(false)
    }
  }, [messages.length])
  
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
      // Simple, direct scroll to bottom - no conflicts
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
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
      setAnimatingMessageText(messageText)
      setIsAnimatingFirstMessage(true)
      setShowStaticMessages(false)
      
      // Trigger GIF animation
      setTimeout(() => {
        setHasFirstMessage(true)
      }, 50)
      
      // Add user message first
      setTimeout(() => {
        setMessages(prev => [...prev, userMessage])
      }, 700)
      
      // Show static message and hide animation simultaneously
      setTimeout(() => {
        setShowStaticMessages(true)
        setIsAnimatingFirstMessage(false)
        setAnimatingMessageText('')
      }, 800) // Complete everything at once to prevent glitches
      
      // Add loading message after animation completes
      setTimeout(() => {
        setMessages(prev => [...prev, loadingMessage])
        setLoadingMessageId(loadingId)
      }, 900)
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
      
      // Transform the loading message into the response
      setIsTransforming(true)
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === loadingId 
            ? { ...msg, content: data.message }
            : msg
        ))
        setIsTransforming(false)
        setLoadingMessageId(null)
      }, 300) // Small delay for smooth transition

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
      setAnimatingMessageText(question)
      setIsAnimatingFirstMessage(true)
      setShowStaticMessages(false)
      
      // Trigger GIF animation
      setTimeout(() => {
        setHasFirstMessage(true)
      }, 50)
      
      // Add user message first
      setTimeout(() => {
        setMessages(prev => [...prev, userMessage])
      }, 700)
      
      // Show static message and hide animation simultaneously
      setTimeout(() => {
        setShowStaticMessages(true)
        setIsAnimatingFirstMessage(false)
        setAnimatingMessageText('')
      }, 800) // Complete everything at once to prevent glitches
      
      // Add loading message after animation completes
      setTimeout(() => {
        setMessages(prev => [...prev, loadingMessage])
        setLoadingMessageId(loadingId)
      }, 900)
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
      
      // Transform the loading message into the response
      setIsTransforming(true)
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === loadingId 
            ? { ...msg, content: data.message }
            : msg
        ))
        setIsTransforming(false)
        setLoadingMessageId(null)
      }, 300) // Small delay for smooth transition

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
            <h2 className="glow-text" data-text="Clubhaus AI">Clubhaus AI</h2>
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
          
          <div className="content" style={{ zIndex: 50 }}>
            {/* Animated GIF with Framer Motion - Independent of welcome screen */}
            <AnimatePresence>
              {(messages.length === 0 || hasFirstMessage || isAnimatingFirstMessage) && (
                <motion.div 
                  ref={initialGifRef}
                  className="relative"
                  style={{ 
                    zIndex: isAnimatingFirstMessage ? 400 : 100,
                    opacity: 1, // Force visibility
                    pointerEvents: 'none' // Don't interfere with other elements
                  }}
                  initial={messages.length === 0 ? {
                    width: '8rem',
                    height: '8rem',
                    margin: '0 auto 1rem',
                    position: 'relative',
                    opacity: 0,
                    scale: 0.8,
                    y: 20
                  } : false}
                  animate={hasFirstMessage ? {
                    position: 'fixed',
                    top: '-14px',
                    right: '3px',
                    width: '3rem',
                    height: '3rem',
                    margin: 0,
                    zIndex: 50,
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0],
                    opacity: 1
                  } : {
                    width: '8rem',
                    height: '8rem',
                    margin: '0 auto 1rem',
                    position: 'relative',
                    opacity: 1, // Always visible
                    scale: 1,
                    y: 0
                  }}
                  transition={{
                    duration: 2.0,
                    ease: [0.16, 1, 0.3, 1],
                    type: "spring",
                    stiffness: 60,
                    damping: 25,
                    scale: {
                      duration: 0.8,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.2
                    },
                    rotate: {
                      duration: 1.2,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.4
                    },
                    opacity: {
                      duration: 0.1, // Very fast opacity change
                      ease: "easeOut"
                    }
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                    y: -20,
                    transition: {
                      duration: 1.0,
                      ease: [0.16, 1, 0.3, 1]
                    }
                  }}
                >
                  {/* Blurred background layer for flow effect */}
                  <motion.img 
                    src="/gifs/Small-Transparent-messeger-app-Chip.gif" 
                    alt="Clubhaus AI Assistant" 
                    className="w-full h-full object-contain absolute inset-0 blur-sm opacity-60 scale-110"
                    animate={{ opacity: 0.6 }}
                    transition={{
                      duration: 1.5,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                  />
                  {/* Main GIF layer */}
                  <motion.img 
                    src="/gifs/Small-Transparent-messeger-app-Chip.gif" 
                    alt="Clubhaus AI Assistant" 
                    className="w-full h-full object-contain relative"
                    style={{ zIndex: 150 }}
                    whileHover={{ scale: 1.05 }}
                    animate={hasFirstMessage ? {
                      scale: [1, 1.01, 1],
                      transition: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    } : {}}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 15
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

                        {/* Animating First Message */}
            <AnimatePresence>
              {isAnimatingFirstMessage && animatingMessageText && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 300 }}
                  initial={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.2 }
                  }}
                >
                  <motion.div
                    className="flex justify-end absolute"
                    style={{ 
                      right: '2rem', // Match messages-list padding (1rem) + message margin
                      left: '2rem',
                      top: '8rem' // Position within the content area to align with messages
                    }}
                    initial={{
                      y: 280, // Start from input position
                      x: 0,
                      scale: 1,
                      opacity: 1
                    }}
                    animate={{
                      y: -112, // Move from 8rem (128px) to 1rem (16px) = -112px
                      x: 0,
                      scale: 1,
                      opacity: 1
                    }}
                    transition={{
                      duration: 0.8,
                      ease: [0.25, 0.46, 0.45, 0.94],
                      type: "spring",
                      stiffness: 120,
                      damping: 18
                    }}
                  >
                    <motion.div
                      className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg overflow-hidden ${
                        isLightMode 
                          ? 'bg-blue-900/20 text-blue-900 border border-blue-900/30'
                          : 'bg-white/20 text-white border border-white/30'
                      }`}
                                             initial={{
                         width: 0,
                         height: 0,
                         borderRadius: "50%",
                         paddingLeft: 0,
                         paddingRight: 0,
                         paddingTop: 0,
                         paddingBottom: 0
                       }}
                       animate={{
                         width: "auto",
                         height: "auto", 
                         borderRadius: "0.5rem",
                         paddingLeft: "1rem",
                         paddingRight: "1rem",
                         paddingTop: "0.75rem",
                         paddingBottom: "0.75rem"
                       }}
                       transition={{
                         duration: 0.5,
                         delay: 0.2,
                         ease: [0.25, 0.46, 0.45, 0.94]
                       }}
                    >
                                             <motion.p
                         className="whitespace-pre-wrap"
                         initial={{ opacity: 0, scale: 0.98 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{
                           duration: 0.3,
                           delay: 0.4,
                           ease: "easeOut"
                         }}
                       >
                         {animatingMessageText}
                       </motion.p>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="messages-container">
              {messages.length === 0 ? (
                <motion.div 
                  className="text-center py-8" 
                  style={{ paddingTop: '9rem' }}
                  animate={{
                    opacity: isAnimatingFirstMessage ? 0 : 1
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut"
                  }}
                >

                  <motion.p 
                    className={`mb-6 ${isLightMode ? 'text-blue-900/80' : 'text-white/80'}`}
                    animate={{
                      opacity: isAnimatingFirstMessage ? 0 : 1,
                      y: isAnimatingFirstMessage ? -20 : 0
                    }}
                    transition={{
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                  >
                    A Clubhaus AI built to talk with you about your project or our business. Whether you're here to build something bold or just exploring, I'm here to help.
                  </motion.p>
                  

                  <motion.div 
                    className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto"
                    animate={{
                      opacity: isAnimatingFirstMessage ? 0 : 1,
                      y: isAnimatingFirstMessage ? -10 : 0
                    }}
                    transition={{
                      duration: 0.25,
                      ease: "easeOut"
                    }}
                  >
                    {quickQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleQuickQuestion(question)}
                        disabled={isAnimatingFirstMessage}
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
                        initial={index === 0 && !showStaticMessages ? {
                          opacity: 0,
                          y: 10
                        } : false}
                        animate={{
                          opacity: index === 0 && !showStaticMessages ? 0 : 1,
                          y: 0
                        }}
                        transition={{
                          duration: 0.3,
                          delay: index === 0 && showStaticMessages ? 0 : index * 0.1,
                          ease: "easeOut"
                        }}
                        style={{
                          visibility: index === 0 && !showStaticMessages ? 'hidden' : 'visible'
                        }}
                      >
                        <motion.div
                          className={`max-w-xs lg:max-w-2xl rounded-lg transition-all duration-500 ${
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
                          initial={message.id === loadingMessageId && message.content !== 'loading' ? { 
                            opacity: 0, 
                            scale: 0.98
                          } : false}
                          animate={{ 
                            opacity: 1, 
                            scale: 1
                          }}
                          transition={{
                            duration: 0.5,
                            ease: "easeOut",
                            delay: message.id === loadingMessageId && message.content !== 'loading' ? 0.3 : 0
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
                              <div className="flex items-center justify-center">
                                <span className={`text-sm ${
                                  isLightMode ? 'text-blue-900/70' : 'text-white/70'
                                }`}>Strategizing...</span>
                              </div>
                            </div>
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