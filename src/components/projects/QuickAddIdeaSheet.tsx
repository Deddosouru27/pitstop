import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onAdd: (content: string) => void
  onClose: () => void
}

export default function QuickAddIdeaSheet({ onAdd, onClose }: Props) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const content = input.trim()
    if (!content) return
    onAdd(content)   // optimistic — caller fires-and-forgets DB write
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#1c1c27] rounded-t-2xl px-4 pt-4 pb-10 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Записать идею..."
            className="flex-1 bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-xl px-4 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
