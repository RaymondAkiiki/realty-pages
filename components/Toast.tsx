'use client'
import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

export default function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className={`toast ${type}`} onClick={onDismiss} style={{ cursor: 'pointer' }}>
      {message}
    </div>
  )
}
