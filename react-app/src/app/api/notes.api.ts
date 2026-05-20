import { apiFetch, BASE_URL } from './client'

export interface SlideNoteDto {
  id: number
  lectureId: number
  slideId: string
  text: string
  createdAt: string
  updatedAt: string
}

/** Все заметки лекции */
export async function getSlideNotes(lectureId: string): Promise<SlideNoteDto[]> {
  return apiFetch(`/lectures/${lectureId}/notes`)
}

/**
 * Заметка к конкретному слайду.
 * Возвращает null если заметки нет (HTTP 204 / 404).
 */
export async function getSlideNote(
  lectureId: string,
  slideId: string
): Promise<SlideNoteDto | null> {
  const res = await fetch(`${BASE_URL}/lectures/${lectureId}/notes/slide/${slideId}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) throw new Error(`getSlideNote error: ${res.status}`)
  return res.json()
}

/** Создать / обновить заметку к слайду (upsert) */
export async function upsertSlideNote(
  lectureId: string,
  slideId: string,
  text: string
): Promise<SlideNoteDto> {
  return apiFetch(`/lectures/${lectureId}/notes/slide/${slideId}`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

/** Обновить заметку по id */
export async function updateSlideNote(
  lectureId: string,
  noteId: number,
  text: string
): Promise<SlideNoteDto> {
  return apiFetch(`/lectures/${lectureId}/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({ text }),
  })
}

/** Удалить заметку по id */
export async function deleteSlideNote(lectureId: string, noteId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/lectures/${lectureId}/notes/${noteId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`deleteSlideNote error: ${res.status}`)
}
