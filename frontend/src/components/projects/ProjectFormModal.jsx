import { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Field, { TextInput, Select } from '../ui/Field.jsx'

const EMPTY = { title: '', status: 'wait', due: '', tags: [] }

// Small tag chip picker with autocomplete against a known tag set.
function TagInput({ tags, onChange }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    fetch(`/api/tags?q=${encodeURIComponent(query.trim())}`)
      .then((r) => r.json())
      .then((data) => setSuggestions(data.tags || []))
      .catch(() => setSuggestions([]))
  }, [query])

  function addTag(name) {
    const clean = name.trim()
    if (!clean || tags.some((t) => (typeof t === 'string' ? t : t.name) === clean)) return
    onChange([...tags, clean])
    setQuery('')
    setSuggestions([])
  }

  function removeTag(index) {
    onChange(tags.filter((_, i) => i !== index))
  }

  function onKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && query.trim()) {
      e.preventDefault()
      addTag(query)
    }
    if (e.key === 'Backspace' && !query.trim() && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div className={`relative rounded-md border border-border bg-bg text-text text-[13px] focus-within:border-accent focus:ring-2 focus:ring-[color:var(--focus-ring)] transition-[border-color,box-shadow] ${showSuggestions ? 'rounded-t-none' : ''}`}>
      <div className="flex flex-wrap gap-1 px-2 py-1.5">
        {tags.map((t, i) => (
          <span key={i} className="rounded-md px-1.5 py-0.5 bg-surface2 border border-border text-[11px] font-mono">
            {typeof t === 'string' ? t : t.name}
            <button type="button" onClick={() => removeTag(i)} className="text-textMuted hover:text-danger ml-1 transition-colors" aria-label="Remove tag">×</button>
          </span>
        ))}
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onKeyDown={onKeyDown}
        placeholder={tags.length === 0 ? 'Add tag… (press Enter)' : ''}
        className="w-full bg-transparent outline-none text-inherit placeholder:text-textMuted px-1 py-1 text-[13px]"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 bg-surface border border-t-0 border-border rounded-b-md overflow-hidden shadow-panel">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s.name) }}
              className="w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-surfaceHover text-textMuted hover:text-text transition-colors"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectFormModal({ open, onClose, onSave, editingProject }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    setForm(editingProject ? { ...editingProject, tags: editingProject.tags || (editingProject.tag ? [{ name: editingProject.tag }] : []) } : EMPTY)
  }, [editingProject, open])

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave(editingProject ? form : { ...form, tags: form.tags.length > 0 ? form.tags : ['General'] })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={400}>
      <div className="p-5 pb-0">
        <div className="font-display text-[16px] font-bold">{editingProject ? 'Edit project' : 'Add project'}</div>
      </div>
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
        <Field label="Title">
          <TextInput
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Client portal redesign"
            required
          />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="wait">On-Wait</option>
            <option value="progress">In-Progress</option>
            <option value="urgent">Urgent</option>
            {editingProject?.status === 'completed' && <option value="completed">Completed</option>}
          </Select>
        </Field>
        <Field label="Due / note">
          <TextInput value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} placeholder="e.g. Due in 3 days" />
        </Field>
        <Field label="Tags">
          <TagInput tags={form.tags} onChange={(next) => setForm({ ...form, tags: next })} />
        </Field>
        <Button variant="primary" type="submit" className="justify-center w-full mt-1">
          {editingProject ? 'Save changes' : 'Add project'}
        </Button>
      </form>
    </Modal>
  )
}
