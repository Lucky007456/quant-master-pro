import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

let toastId = 0
let addToastGlobal = null

export function useToast() {
  return { toast: addToastGlobal }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((type, text) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, type, text }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3200)
  }, [])

  useEffect(() => {
    addToastGlobal = {
      success: (text) => addToast('success', text),
      info: (text) => addToast('info', text),
      warning: (text) => addToast('warning', text),
      error: (text) => addToast('error', text),
    }
  }, [addToast])

  if (toasts.length === 0) return null

  return createPortal(
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✅' : t.type === 'info' ? '💡' : t.type === 'warning' ? '⚠️' : '❌'}
          </span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>,
    document.body
  )
}
