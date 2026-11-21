const VARIANTS = {
  default:
    'bg-[var(--button-default-bg)] border border-[var(--button-default-border)] text-[var(--button-default-fg)] hover:bg-[var(--button-default-hover-bg)] hover:border-[var(--accent-border)]',
  primary:
    'bg-accent-gradient border border-[var(--button-primary-border)] text-onAccent hover:brightness-105 font-semibold shadow-sm hover:shadow',
  danger: 'bg-transparent border border-[var(--button-danger-border)] text-[var(--button-danger-fg)] hover:bg-danger hover:text-onDanger',
  ghost: 'bg-transparent border border-transparent text-textMuted hover:bg-surface2 hover:text-text',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-[12px] rounded-[var(--button-radius)]',
  md: 'px-3.5 py-2 text-[13px] rounded-[var(--button-radius)]',
  lg: 'px-4 py-2.5 text-[13.5px] rounded-md',
}

export default function Button({ variant = 'default', size = 'md', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-medium leading-none transition-[background,border-color,color,transform,box-shadow] duration-[var(--primitive-duration-fast)] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
