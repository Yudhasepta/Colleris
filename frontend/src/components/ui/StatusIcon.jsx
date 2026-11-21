const PATHS = {
  wait: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  progress: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </>
  ),
  urgent: (
    <>
      <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z" />
      <path d="M12 8v5M12 16.5v.01" />
    </>
  ),
  completed: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 5-5" />
    </>
  ),
}

export default function StatusIcon({ status, className = 'w-full h-full', spin = false }) {
  const path = PATHS[status]
  if (!path) return null
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={status === 'urgent' ? 2.4 : 2.2}
      className={`${className} ${status === 'progress' && spin ? 'animate-status-spin' : ''}`}
    >
      {path}
    </svg>
  )
}
