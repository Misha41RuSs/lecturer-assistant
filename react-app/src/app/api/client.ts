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

export async function uploadPresentation(fileBuffer: Buffer, fileName: string) {
	const formData = new FormData()
	formData.append('file', new Blob([new Uint8Array(fileBuffer)]), fileName)

	const res = await fetch(`${BASE_URL}/presentations/upload`, {
		method: 'POST',
		body: formData
	})

	if (!res.ok) throw new Error('Upload failed')

	return res.json()
}

export async function createLecture(name: string) {
	const res = await fetch(`${BASE_URL}/lectures`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ name })
	})

	if (!res.ok) {
		throw new Error(`Failed to create lecture: ${res.status}`)
	}

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

export async function updateCurrentSlide(lectureId: number, slideId: string) {
	const res = await fetch(`${BASE_URL}/lectures/${lectureId}/current-slide`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ slide_id: slideId })
	})

	if (!res.ok) {
		throw new Error(`Failed to update slide: ${res.status}`)
	}

	return res.json()
}

/**
 * Создает WebSocket соединение для лекции
 * @param lectureId - id лекции
 * @param onMessage - callback на сообщение
 */
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
