const SIZES = { sm: 'w-6 h-6 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm' }

export default function Avatar({ initials, size = 'md', className = '' }) {
  return (
    <div
      className={`${SIZES[size]} rounded-full flex items-center justify-center font-display font-bold flex-shrink-0 ${className}`}
      style={{ background: 'var(--accent-soft-bg)', color: 'var(--on-accent)' }}
    >
      {initials}
    </div>
  )
}
