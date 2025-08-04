'use client'

import { useEffect, useState } from 'react'

interface ScribbleAnimationProps {
  isVisible: boolean
  className?: string
}

export function ScribbleAnimation({ isVisible, className = '' }: ScribbleAnimationProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [hasBeenVisible, setHasBeenVisible] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setHasBeenVisible(true)
      // Small delay to ensure the animation triggers properly
      const timer = setTimeout(() => {
        setShouldAnimate(true)
      }, 100)
      return () => clearTimeout(timer)
    }
    // Don't reset shouldAnimate when isVisible becomes false - keep it animated
  }, [isVisible])

  // Show animation if it's currently visible OR if it has been visible before (persistent)
  if (!isVisible && !hasBeenVisible) return null

  return (
    <div className={`scribble-animation-container ${className}`}>
      <svg 
        width="80" 
        height="25" 
        viewBox="0 0 80 25" 
        xmlns="http://www.w3.org/2000/svg"
        className="scribble-svg"
      >
        <defs>
          <linearGradient id="scribbleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line 1 */}
        <path
          id="line1"
          d="M3,5 Q8,4 13,5.5 Q18,7 23,4.5 Q28,3 33,5.5 Q38,6.5 43,4 Q48,6 53,5 Q58,4.5 63,5.5 Q68,7 73,4.5"
          fill="none"
          stroke="url(#scribbleGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="120"
          strokeDashoffset={shouldAnimate ? "0" : "120"}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out'
          }}
        />

        {/* Line 2 */}
        <path
          id="line2"
          d="M3,12 C8,10 13,14 18,12 C23,10 28,14 33,12 C38,10 43,14 48,12 C53,10 58,14 63,12 C68,10 73,14 78,12"
          fill="none"
          stroke="url(#scribbleGradient)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="120"
          strokeDashoffset={shouldAnimate ? "0" : "120"}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out 0.2s'
          }}
        />

        {/* Line 3 */}
        <path
          id="line3"
          d="M3,19 L8,18.5 L13,20 L18,18.8 L23,19.2 L28,18.4 L33,19.8 L38,18.8 L43,19.4 L48,18.6 L53,19.6 L58,18.8 L63,19.2 L68,18.4 L73,19.8"
          fill="none"
          stroke="url(#scribbleGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="120"
          strokeDashoffset={shouldAnimate ? "0" : "120"}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out 0.4s'
          }}
        />
      </svg>
    </div>
  )
} 