import Button from './Button.jsx'

export default function GuestLock({ onLogin, title = 'Log in to see your projects', description }) {
  return (
    <div className="rounded-md">
      <div className="rounded-md shadow-panel px-6 py-5 text-center max-w-[280px] mx-4">
        <div
          className="rounded-md flex items-center justify-center mx-auto mb-3"
          style={{ background: 'color-mix(in srgb, var(--accent) 18%, transparent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" className="w-[17px] h-[17px]">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <div className="font-display text-[14px] font-semibold">{title}</div>
        {description && <div className="text-[12px] text-textMuted mt-1">{description}</div>}
        <Button variant="primary" onClick={onLogin} className="mt-3.5 w-full justify-center">
          Log in / Register
        </Button>
      </div>
    </div>
  )
}
