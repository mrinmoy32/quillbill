import { forwardRef, useId } from 'react'
import { cn } from '@/lib/cn'

const control =
  'block w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-ink-mute focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-canvas'

/** Label + control + hint/error. `error` is the message to show under the control. */
export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : hint && <span className="mt-1 block text-xs text-ink-mute">{hint}</span>}
    </label>
  )
}

export const Input = forwardRef(function Input({ label, hint, error, className, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <input ref={ref} className={cn(control, 'h-10', error ? 'border-red-400' : 'border-line')} {...rest} />
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea({ label, hint, error, className, rows = 3, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <textarea ref={ref} rows={rows} className={cn(control, 'py-2', error ? 'border-red-400' : 'border-line')} {...rest} />
    </Field>
  )
})

export function Select({ label, hint, error, className, children, ...rest }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <select id={id} className={cn(control, 'h-10', error ? 'border-red-400' : 'border-line')} {...rest}>
        {children}
      </select>
    </Field>
  )
}
