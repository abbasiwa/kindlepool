import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, forwardRef } from 'react'
import { motion } from 'framer-motion'

/* ─── Button ─── */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-warm-300 text-cream-50 hover:bg-warm-400 active:scale-[0.98]',
      secondary: 'bg-cream-200 text-text-light hover:bg-cream-300 active:scale-[0.98] border border-cream-400',
      ghost: 'bg-transparent text-text-light hover:bg-cream-200 active:scale-[0.98]',
      danger: 'bg-error text-cream-50 hover:opacity-90 active:scale-[0.98]',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-7 py-3.5 text-lg',
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={loading || props.disabled}
        {...(props as any)}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </motion.button>
    )
  },
)
Button.displayName = 'Button'

/* ─── Card ─── */
interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', hover, onClick }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -3 } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`bg-surface rounded-xl border border-cream-400/50 p-6 ${hover ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  )
}

/* ─── Input ─── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-muted-200">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-4 py-2.5 bg-surface border border-cream-400 rounded-xl text-text-light placeholder:text-cream-500 focus:outline-none focus:border-warm-300 focus:ring-1 focus:ring-warm-300/30 transition-all ${error ? 'border-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-error">{error}</span>}
    </div>
  ),
)
Input.displayName = 'Input'

/* ─── ProgressBar ─── */
interface ProgressBarProps {
  value: number
  max: number
  className?: string
}

export function ProgressBar({ value, max, className = '' }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className={`h-2 bg-cream-300 rounded-full overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="h-full rounded-full bg-gradient-to-r from-warm-300 to-warm-200"
      />
    </div>
  )
}

/* ─── Modal ─── */
interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  if (!open) return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-light">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-cream-200 transition-colors text-muted-100 hover:text-text-light">
              ✕
            </button>
          </div>
        )}
        {children}
      </motion.div>
    </motion.div>
  )
}

/* ─── Tabs ─── */
interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-cream-200 rounded-2xl overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            active === tab.id
              ? 'bg-surface text-text-light shadow-tactile'
              : 'text-muted-100 hover:text-text-light'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Skeleton ─── */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-shimmer rounded-lg min-h-[1em] ${className}`} />
}

/* ─── Badge ─── */
interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const colors = {
    default: 'bg-cream-200 text-muted-200',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    error: 'bg-error/20 text-error',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[variant]}`}>
      {children}
    </span>
  )
}
