import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

const styles = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-50 text-blue-800',
  overdue: 'bg-red-50 text-red-800',
  paid: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-500 line-through',
}

/** Shows an invoice's display_status ("draft" | "sent" | "overdue" | "paid" | "cancelled"). */
export default function StatusBadge({ status }) {
  const { t } = useTranslation()
  return <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium', styles[status])}>{t(`status.${status}`)}</span>
}
