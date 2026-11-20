import { cn } from '@/lib/cn'

export default function Card({ className, children, ...rest }) {
  return (
    <div className={cn('rounded-xl border border-line bg-white', className)} {...rest}>
      {children}
    </div>
  )
}
