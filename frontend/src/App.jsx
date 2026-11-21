import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import RequireAdmin from './components/layout/RequireAdmin.jsx'
import MainPage from './pages/MainPage.jsx'
import OthersPage from './pages/OthersPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
          <div className="rounded-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-danger flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="font-display text-[15px] font-bold text-danger">Something went wrong</span>
            </div>
            <p className="text-[12.5px] text-textMuted mb-4">
              A rendering error was caught by the application boundary. The page will not show until this is fixed.
            </p>
            <details className="rounded-md p-3 overflow-auto max-h-32">
              <summary className="cursor-pointer select-none mb-1">Error details</summary>
              <pre>{this.state.error?.toString?.()}</pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-border text-sm font-semibold hover:bg-surfaceHover transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<MainPage />} />
            <Route path="/others" element={<OthersPage />} />
            <Route path="/profile/:id?" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
