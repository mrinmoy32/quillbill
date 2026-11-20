import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

const variants = {
  primary: 'bg-brand text-white hover:bg-brand-strong',
  secondary: 'bg-white text-ink border border-line hover:bg-canvas',
  ghost: 'text-ink-soft hover:bg-black/5',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
}
const sizes = { md: 'h-10 px-4 text-sm', sm: 'h-8 px-3 text-sm', lg: 'h-12 px-6 text-base' }

/** <Button>, or a link that looks like a button: <Button to="/invoices/new">. */
export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, to, className, children, disabled, ...rest }) {
  const classes = cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </>
  )
  if (to) return <Link to={to} className={classes} {...rest}>{content}</Link>
  return (
    <button type="button" className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  )
}
