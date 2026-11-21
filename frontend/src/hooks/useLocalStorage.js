import { useEffect, useState } from 'react'

// A useState that persists to localStorage under `key`, and re-reads if
// `key` changes (used when data is scoped per-account, e.g. projects_u1
// vs projects_u6 after switching accounts).
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      setValue(raw ? JSON.parse(raw) : initialValue)
    } catch {
      setValue(initialValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [key, value])

  return [value, setValue]
}
