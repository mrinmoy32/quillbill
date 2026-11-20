import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from './Button'

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-mute" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

/** An empty list is an invitation to act: say what this is, and give one clear button. */
export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-brand-soft p-3 text-brand">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <h3 className="text-base font-semibold">{t('common.loadFailed')}</h3>
      <p className="mt-1 text-sm text-ink-soft">{error?.message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
