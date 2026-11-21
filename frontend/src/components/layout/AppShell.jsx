import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import BottomNav from './BottomNav.jsx'
import NotificationBell from './NotificationBell.jsx'
import { NotificationsProvider } from '../../context/NotificationsContext.jsx'

export default function AppShell() {
  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-bg text-text flex">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          <Outlet />
        </main>
        <BottomNav />
        <NotificationBell />
      </div>
    </NotificationsProvider>
  )
}
