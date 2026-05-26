import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, NotebookPen, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  type SlideNoteDto,
  deleteSlideNote,
  getSlideNote,
  upsertSlideNote,
} from '../app/api/notes.api'

interface Props {
  lectureId: string
  /** UUID слайда (из slidesData[i].id) */
  slideId: string
  /** Порядковый номер для заголовка */
  slideIndex: number
  onClose: () => void
}

export function SlideNotesPanel({ lectureId, slideId, slideIndex, onClose }: Props) {
  const [note, setNote] = useState<SlideNoteDto | null>(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragOffset = useRef<{ x: number; y: number } | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragOffset.current) return
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
  }, [])

  const handleMouseUp = useCallback(() => {
    dragOffset.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const handleDragStart = (e: React.MouseEvent) => {
    const panel = panelRef.current
    if (!panel || !panel.offsetParent) return
    const panelRect = panel.getBoundingClientRect()
    const parentRect = panel.offsetParent.getBoundingClientRect()
    const x = panelRect.left - parentRect.left
    const y = panelRect.top - parentRect.top
    dragOffset.current = { x: e.clientX - x, y: e.clientY - y }
    setPos({ x, y })
    e.preventDefault()
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Загрузка заметки при смене слайда
  useEffect(() => {
    if (!slideId || slideId === 'qr-slide') {
      setNote(null)
      setDraft('')
      setLoading(false)
      return
    }
    setLoading(true)
    getSlideNote(lectureId, slideId)
      .then(n => {
        setNote(n)
        setDraft(n?.text ?? '')
      })
      .catch(() => toast.error('Не удалось загрузить заметку'))
      .finally(() => setLoading(false))
  }, [lectureId, slideId])

  // Автофокус после загрузки
  useEffect(() => {
    if (!loading) textareaRef.current?.focus()
  }, [loading])

  const isDirty = draft !== (note?.text ?? '')

  const handleSave = async () => {
    if (!isDirty || saving) return
    setSaving(true)
    try {
      const saved = await upsertSlideNote(lectureId, slideId, draft.trim())
      setNote(saved)
      setDraft(saved.text)
      toast.success('Заметка сохранена')
    } catch {
      toast.error('Не удалось сохранить заметку')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!note) return
    setDeleting(true)
    try {
      await deleteSlideNote(lectureId, note.id)
      setNote(null)
      setDraft('')
      toast.success('Заметка удалена')
    } catch {
      toast.error('Не удалось удалить заметку')
    } finally {
      setDeleting(false)
    }
  }

  // Ctrl+Enter — сохранить
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') onClose()
  }

  const isQr = slideId === 'qr-slide'

  return (
    <div
      ref={panelRef}
      id="slide-notes-panel"
      className="slide-notes-panel"
      role="dialog"
      aria-label="Заметки к слайду"
      style={pos ? { top: pos.y, left: pos.x, bottom: 'auto' } : undefined}
    >
      {/* Header — drag handle */}
      <div className="snp-header snp-header--draggable" onMouseDown={handleDragStart}>
        <div className="snp-title">
          <NotebookPen size={15} />
          <span>Заметки — слайд {slideIndex}</span>
        </div>
        <button
          id="slide-notes-close-btn"
          className="snp-close-btn"
          onClick={onClose}
          onMouseDown={e => e.stopPropagation()}
          title="Закрыть"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="snp-body">
        {isQr ? (
          <p className="snp-empty">Заметки недоступны для QR-слайда.</p>
        ) : loading ? (
          <div className="snp-loading">
            <Loader2 size={20} className="snp-spinner" />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            id="slide-note-textarea"
            className="snp-textarea"
            placeholder="Ваши заметки к этому слайду…&#10;&#10;Ctrl+Enter — сохранить"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={8}
          />
        )}
      </div>

      {/* Footer */}
      {!isQr && !loading && (
        <div className="snp-footer">
          {note && (
            <button
              id="slide-notes-delete-btn"
              className="snp-btn snp-btn-danger"
              onClick={handleDelete}
              disabled={deleting}
              title="Удалить заметку"
            >
              {deleting ? <Loader2 size={14} className="snp-spinner" /> : <Trash2 size={14} />}
              Удалить
            </button>
          )}

          <button
            id="slide-notes-save-btn"
            className={`snp-btn snp-btn-primary ${!isDirty ? 'snp-btn-disabled' : ''}`}
            onClick={handleSave}
            disabled={!isDirty || saving}
            title="Сохранить заметку (Ctrl+Enter)"
          >
            {saving ? (
              <Loader2 size={14} className="snp-spinner" />
            ) : (
              <Check size={14} />
            )}
            Сохранить
          </button>
        </div>
      )}

      {/* Hint */}
      {note && !loading && !isQr && (
        <div className="snp-hint">
          Обновлено: {new Date(note.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
