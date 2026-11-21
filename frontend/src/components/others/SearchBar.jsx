import { useState } from 'react'
import { Select, TextInput } from '../ui/Field.jsx'

export default function SearchBar({ onSearch }) {
  const [mode, setMode] = useState('userId')
  const [query, setQuery] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSearch(mode, query.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <Select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full sm:w-32 flex-shrink-0">
        <option value="userId">User ID</option>
        <option value="profileCode">Profile Code</option>
      </Select>
      <div className="relative flex-1 min-w-0">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'userId' ? 'e.g. AT-2201' : 'e.g. X7K9-QP'}
          className="pl-9 w-full"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 rounded-md bg-accent-gradient text-onAccent text-[13px] font-semibold hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] flex-shrink-0 transition-colors"
      >
        Search
      </button>
    </form>
  )
}
