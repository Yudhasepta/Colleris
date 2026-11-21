import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme, presetLogo } from '../../context/ThemeContext.jsx'
import Avatar from '../ui/Avatar.jsx'

export default function Sidebar() {
  const { user, isGuest, isAdmin, booting } = useAuth()
  const { preset } = useTheme()
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || (!booting && isAdmin))

  return (
    <aside
      className="hidden md:flex flex-col w-60 flex-shrink-0 border-r border-border h-screen sticky top-0 px-4 py-6"
      style={{ background: 'var(--sidebar)' }}
    >
      <div className="flex items-center gap-2.5 px-1 mb-7">
        <img key={preset} src={presetLogo(preset)} alt="Colleris" className="w-8 h-8 flex-shrink-0" />
        <span className="font-display text-accent-gradient font-bold text-[15px] tracking-tight">Colleris</span>
      </div>

      <div className="px-1 mb-2 flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-textMuted">Workspace</span>
        <span className="h-px flex-1 bg-border/60" />
      </div>

      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative flex items-center gap-3 pl-4 pr-3 py-[7px] rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] ${
                isActive ? 'bg-surface2 text-text' : 'text-textMuted hover:text-text hover:bg-surface2/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-[3px] h-[26px] rounded-full"
                    style={{ background: 'var(--accent-bg)' }}
                  />
                )}
                <span
                  className="font-mono text-[10px] w-4 flex-shrink-0"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}
                >
                  {item.num}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-[16px] h-[16px] flex-shrink-0"
                  style={isActive ? { color: 'var(--accent)' } : undefined}
                >
                  {item.icon}
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-tight truncate">{item.label}</span>
                  <span
                    className={`block text-[9.5px] font-mono uppercase tracking-[0.12em] leading-tight truncate ${isActive ? 'text-textMuted' : 'text-textMuted'}`}
                  >
                    {item.meta}
                  </span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        {isGuest ? (
          <div className="px-1 flex items-center gap-2 text-[11px] text-textMuted">
            <span className="w-1.5 h-1.5 rounded-full bg-surface2 border border-border flex-shrink-0" />
            <span className="font-mono">viewing as guest</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Avatar initials={user.initials} size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{user.name}</div>
              <div className="text-[10px] font-mono text-textMuted truncate">{user.userId}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
