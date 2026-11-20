import { formatMoney, intlLocale } from '@/lib/money'
import { useMe } from '@/features/auth/useMe'

/** <Money minor={123450} currency="INR" />  ->  ₹1,234.50, formatted for the business's locale. */
export default function Money({ minor, currency }) {
  const { data } = useMe()
  return <>{formatMoney(minor, currency || data?.business.currency, intlLocale(data?.business.locale))}</>
}
