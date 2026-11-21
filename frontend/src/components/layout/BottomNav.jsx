import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function BottomNav() {
  const { isAdmin, booting } = useAuth()
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || (!booting && isAdmin))

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border flex items-stretch h-[60px] pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className="relative flex-1 flex flex-col items-center justify-center gap-1"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full"
                  style={{ background: 'var(--accent-bg)' }}
                />
              )}
              <span
                className="absolute top-3 right-3 font-mono text-[8px]"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}
              >
                {item.num}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-[18px] h-[18px]"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}
              >
                {item.icon}
              </svg>
              <span className="text-[10px] font-medium leading-none" style={{ color: isActive ? 'var(--text)' : 'var(--text-faint)' }}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
