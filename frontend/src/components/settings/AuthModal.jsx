import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { TextInput } from '../ui/Field.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme, presetLogo } from '../../context/ThemeContext.jsx'

const TABS = [
  { id: 'login', label: 'Log in', dot: 'var(--accent)' },
  { id: 'signup', label: 'Register', dot: 'var(--warn)' },
]

function PasswordInput({ value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <TextInput
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-textMuted hover:text-text transition-colors focus-visible:outline-none"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default function AuthModal({ open, onClose }) {
  const { login, register } = useAuth()
  const { preset } = useTheme()
  const [tab, setTab] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Start clean on reopen instead of showing the abandoned draft.
  useEffect(() => {
    if (!open) {
      setTab('login')
      setName('')
      setEmail('')
      setPassword('')
      setConfirm('')
      setError('')
      setSubmitting(false)
    }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (tab === 'signup' && !name.trim()) return setError('Please enter your name.')
    if (!email.trim() || !password) return setError('Email and password are required.')
    if (tab === 'signup' && password !== confirm) return setError('Passwords do not match.')

    setSubmitting(true)
    try {
      if (tab === 'login') await login(email.trim(), password)
      else await register(name.trim(), email.trim(), password)
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={360}>
      {/* Semantic edge — understated hint of the Colleris palette */}
      <div
        className="h-[3px] rounded-t-lg"
        style={{
          background: 'linear-gradient(90deg, var(--accent), var(--cyan), var(--pink), var(--purple), var(--mint))',
        }}
      />
      {/* Brand header */}
      <div className="px-6 pt-6 pb-5 text-center border-b border-border">
        <img key={preset} src={presetLogo(preset)} alt="Colleris" className="w-10 h-10 mx-auto mb-3" />
        <div className="font-display text-accent-gradient text-[16px] font-bold tracking-tight">Colleris</div>
        <div className="text-[12px] text-textMuted mt-0.5">{tab === 'login' ? 'Sign in to your workspace' : 'Set up your workspace'}</div>
      </div>

      {/* Login / Register tabs — two states of one component */}
      <div className="flex gap-1 bg-surface2 rounded-md p-1 mx-6 mt-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
              tab === t.id ? 'bg-surface text-text shadow-sm' : 'text-textMuted hover:text-text'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {tab === t.id && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.dot }} />}
              {t.label}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="px-6 pt-5 pb-6 flex flex-col gap-3">
        {tab === 'signup' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-textMuted">Full name</span>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-textMuted">Email</span>
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-textMuted">Password</span>
          <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" />
        </label>
        {tab === 'signup' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-textMuted">Confirm password</span>
            <PasswordInput value={confirm} onChange={setConfirm} placeholder="••••••••" />
          </label>
        )}

        {error && <div className="text-[11.5px] text-warn">{error}</div>}

        <Button variant="primary" type="submit" className="justify-center w-full mt-1.5 py-2.5" disabled={submitting}>
          {submitting ? 'Please wait…' : tab === 'login' ? 'Log in' : 'Create account'}
        </Button>
      </form>
    </Modal>
  )
}
