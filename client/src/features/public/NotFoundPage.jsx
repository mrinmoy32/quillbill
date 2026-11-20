import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-semibold">{t('notFound.title')}</h1>
      <p className="text-ink-soft">{t('notFound.text')}</p>
      <Button to="/">{t('notFound.back')}</Button>
    </div>
  )
}
