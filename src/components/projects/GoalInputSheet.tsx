import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onDecompose: (goalText: string) => Promise<void>
  isLoading: boolean
}

export default function GoalInputSheet({ isOpen, onClose, onDecompose, isLoading }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setText('')
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!text.trim() || isLoading) return
    await onDecompose(text.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" onClick={() => { if (!isLoading) onClose() }}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#1c1c27] rounded-t-2xl p-5 pb-10 shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-100">Задать цель</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 size={32} className="animate-spin text-accent" />
            <p className="text-sm text-slate-400 text-center">
              Claude анализирует цель и контекст проекта...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Опишите что хотите реализовать</label>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                rows={4}
                placeholder="Например: добавить AI-генерацию квестов, переработать экран персонажа, сделать систему ежедневных заданий..."
                className="w-full bg-surface text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-accent resize-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Декомпозировать →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
