import { createContext, useCallback, useContext, useState } from 'react'
import { cn } from '@/lib/cn'

const ToastContext = createContext(() => {})

/** const toast = useToast();  toast('Saved'); toast('Failed', 'error') */
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random()
    setToasts((all) => [...all, { id, message, tone }])
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto rounded-lg px-4 py-2.5 text-sm font-medium text-white', t.tone === 'error' ? 'bg-red-700' : 'bg-ink')}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
