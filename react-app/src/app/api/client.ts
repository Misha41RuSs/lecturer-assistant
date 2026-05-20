const BASE_URL = import.meta.env.VITE_API_URL
const WS_URL = import.meta.env.VITE_WS_URL
export { BASE_URL, WS_URL }

export async function apiFetch(path: string, options?: RequestInit) {
	const res = await fetch(`${BASE_URL}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(options?.headers || {})
		}
	})

	if (!res.ok) {
		const text = await res.text()
		throw new Error(`API error: ${res.status} ${text}`)
	}

	return res.json()
}

export async function uploadPresentation(file: File) {
	const formData = new FormData()
	formData.append('file', file)

	const res = await fetch(`${BASE_URL}/presentations/upload`, {
		method: 'POST',
		body: formData
	})

	if (!res.ok) throw new Error('Upload failed')

	return res.json()
}

export async function createLecture(name: string, sequenceId: string) {
	const res = await fetch(`${BASE_URL}/lectures`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ name, sequenceId })
	})

	if (!res.ok) {
		throw new Error(`Failed to create lecture: ${res.status}`)
	}

	return res.json()
}

export interface LectureListItem {
	id: number
	name: string
	status: string
	currentSlide: number
	sequenceId: string | null
}

/** Все лекции из БД (сверка имён и id для /join в Telegram) */
export async function listLectures(): Promise<LectureListItem[]> {
	const res = await fetch(`${BASE_URL}/lectures`)
	if (!res.ok) {
		const t = await res.text()
		throw new Error(`Failed to list lectures: ${res.status} ${t}`)
	}
	return res.json()
}

export async function getLecture(id: number) {
	const res = await fetch(`${BASE_URL}/lectures/${id}`)
	if (!res.ok) throw new Error('Failed to load lecture')
	return res.json()
}

export async function deleteLecture(lectureId: number): Promise<void> {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}`, {
		method: 'DELETE'
	})
	if (!res.ok) {
		const t = await res.text()
		throw new Error(`Failed to delete lecture: ${res.status} ${t}`)
	}
}

export async function getSlideSequence(sequenceId: string) {
	const res = await fetch(`${BASE_URL}/slide-sequences/${sequenceId}`)
	if (!res.ok) throw new Error('Failed to load sequence')
	return res.json()
}

export async function startLecture(lectureId: number) {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/start`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	})

	if (!res.ok) {
		throw new Error(`Failed to start lecture: ${res.status}`)
	}

	return res.json()
}

export async function stopLecture(lectureId: number) {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/stop`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	})

	if (!res.ok) {
		const t = await res.text()
		throw new Error(`Failed to stop lecture: ${res.status} ${t}`)
	}

	return res.json()
}

export async function updateCurrentSlide(lectureId: number, slideId: string) {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/current-slide`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ slideNumber: parseInt(slideId, 10) })
	})

	const text = await res.text()
	if (!res.ok) {
		throw new Error(`Failed to update slide: ${res.status} ${text}`)
	}
	if (!text.trim()) return null
	try {
		return JSON.parse(text) as unknown
	} catch {
		return null
	}
}

export async function updateLecture(
	lectureId: number,
	body: { name: string; accessType?: string; password?: string }
) {
	const payload: Record<string, string> = { name: body.name.trim() }
	if (body.accessType) payload.accessType = body.accessType
	if (body.password !== undefined) payload.password = body.password

	const res = await fetch(`${BASE_URL}/lectures/${lectureId}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	})

	if (!res.ok) {
		const t = await res.text()
		throw new Error(`Failed to update lecture: ${res.status} ${t}`)
	}

	return res.json()
}

export interface StudentDto {
	chatId: number
	firstName: string | null
	lastName: string | null
	username: string | null
	kicked: boolean
}

/** Текущие студенты (только подключённые, для активной лекции) */
export async function getLectureStudents(lectureId: string): Promise<StudentDto[]> {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/students`)
	if (!res.ok) throw new Error('Failed to load students')
	return res.json()
}

/** Все участники лекции включая отключённых и выгнанных (для статистики) */
export async function getAllStudents(lectureId: string): Promise<StudentDto[]> {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/all-students`)
	if (!res.ok) throw new Error('Failed to load all students')
	return res.json()
}

export async function kickLectureStudent(lectureId: string, chatId: number): Promise<void> {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/kick/${chatId}`, { method: 'POST' })
	if (!res.ok) throw new Error('Failed to kick student')
}

export async function broadcastMessage(lectureId: string, text: string): Promise<void> {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/broadcast-message`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text })
	})
	if (!res.ok) {
		const t = await res.text()
		throw new Error(`Failed to broadcast message: ${res.status} ${t}`)
	}
}

export async function getStudentQuestions(lectureId: string): Promise<{ id: string; text: string; createdAt: string }[]> {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/student-questions`)
	if (!res.ok) throw new Error('Failed to load questions')
	return res.json()
}

export async function sendPrivateReply(lectureId: string, questionId: string, text: string): Promise<void> {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/student-questions/${questionId}/private-reply`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text })
	})
	if (!res.ok) {
		const t = await res.text()
		throw new Error(`Failed to send private reply: ${res.status} ${t}`)
	}
}

export async function sendBroadcastReply(lectureId: string, questionId: string, text: string): Promise<void> {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/student-questions/${questionId}/broadcast-reply`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text })
	})
	if (!res.ok) {
		const t = await res.text()
		throw new Error(`Failed to send broadcast reply: ${res.status} ${t}`)
	}
}

export async function broadcastSlideImage(lectureId: number, imageBlob: Blob): Promise<void> {
	const formData = new FormData()
	formData.append('image', imageBlob, 'slide.png')
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/broadcast-image`, {
		method: 'POST',
		body: formData
	})
	if (!res.ok) {
		const t = await res.text()
		throw new Error(`Failed to broadcast image: ${res.status} ${t}`)
	}
}

export async function updateSlideSequence(sequenceId: string, slideIds: string[]) {
	const res = await fetch(`${BASE_URL}/slide-sequences/${sequenceId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(slideIds)
	})
	if (!res.ok) {
		const t = await res.text()
		throw new Error(`Failed to update sequence: ${res.status} ${t}`)
	}
	return res.json()
}

// ---------------------------------------------------------------------------
// Slide metadata (title + notes) — stubs until backend implements endpoints
// ---------------------------------------------------------------------------

export interface SlideMeta {
	id: string
	title: string
	notes: string
}

/**
 * TODO: replace stub with GET /slide-sequences/{sequenceId}/slides
 * Expected response: SlideMeta[]
 */
export async function getSlidesMeta(sequenceId: string): Promise<SlideMeta[]> {
    const res = await fetch(`${BASE_URL}/slide-sequences/${sequenceId}/slides`)

    if (!res.ok) {
        const t = await res.text()
        throw new Error(`Failed to load slides meta: ${res.status} ${t}`)
    }

    const data = await res.json()

    // backend пока title only, notes добавляем пустыми
    return data.map((slide: any) => ({
        id: slide.id,
        title: slide.title ?? '',
        notes: ''
    }))
}

/**
 * TODO: replace stub with PATCH /slides/{slideId}
 * Expected body: { title?: string; notes?: string }
 */
export async function updateSlideMeta(
	_slideId: string,
	_patch: { title?: string; notes?: string }
): Promise<void> {
	console.warn('[stub] updateSlideMeta — endpoint not implemented yet', {
		slideId: _slideId,
		patch: _patch
	})
}

// ---------------------------------------------------------------------------

export function createLectureSocket(
	lectureId: number,
	onMessage: (data: any) => void
) {
	const ws = new WebSocket(`${WS_URL}/ws/broadcasting/${lectureId}`)

	ws.onmessage = event => {
		try {
			const data = JSON.parse(event.data)
			onMessage(data)
		} catch (e) {
			console.error('Invalid WS message', e)
		}
	}

	return ws
}
