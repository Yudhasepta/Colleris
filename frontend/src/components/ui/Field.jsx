export default function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-textMuted">{label}</label>
      {children}
      {hint && <div className="text-[11.5px] text-textMuted">{hint}</div>}
    </div>
  )
}

const base =
  'w-full px-3 py-2 rounded-md border border-border bg-bg text-text text-[13px] placeholder:text-textMuted focus:outline-none focus:border-accent focus:ring-2 focus:ring-[color:var(--focus-ring)] transition-[border-color,box-shadow]'

export function TextInput({ className = '', ...props }) {
  return <input className={`${base} ${className}`} {...props} />
}
export function TextArea({ className = '', ...props }) {
  return <textarea className={`${base} resize-y min-h-[90px] leading-relaxed ${className}`} {...props} />
}
export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${base} ${className}`} {...props}>
      {children}
    </select>
  )
}
