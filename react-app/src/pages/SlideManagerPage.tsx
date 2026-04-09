import { useEffect, useState } from 'react'
import { Trash2, Eye, MessageSquare, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { getLecture, getSlideSequence, updateSlideSequence, BASE_URL } from '../app/api/client'

interface Slide {
	uuid: string
	index: number
	imageUrl: string
	comment: string
}

export function SlideManagerPage() {
	const { lectureId } = useParams<{ lectureId: string }>()
	const [slides, setSlides] = useState<Slide[]>([])
	const [lectureName, setLectureName] = useState('')
	const [sequenceId, setSequenceId] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [selectedUuid, setSelectedUuid] = useState<string | null>(null)
	const [commentText, setCommentText] = useState('')
	const [previewOpen, setPreviewOpen] = useState(false)
	const [previewIdx, setPreviewIdx] = useState(0)

	useEffect(() => {
		if (!lectureId) return
		;(async () => {
			try {
				setLoading(true)
				setLoadError(null)
				const lecture = await getLecture(parseInt(lectureId))
				setLectureName(lecture.name || '')

				if (!lecture.sequenceId) {
					setLoadError('К лекции не привязана презентация')
					return
				}

				setSequenceId(lecture.sequenceId)
				const seq = await getSlideSequence(lecture.sequenceId)
				const uuids: string[] = seq.slides || []

				const built: Slide[] = uuids.map((uuid, idx) => ({
					uuid,
					index: idx + 1,
					imageUrl: `${BASE_URL}/slide-sequences/${lecture.sequenceId}/slide/${idx + 1}`,
					comment: ''
				}))

				setSlides(built)
				if (built.length > 0) setSelectedUuid(built[0].uuid)
			} catch (e) {
				setLoadError(e instanceof Error ? e.message : 'Ошибка загрузки')
			} finally {
				setLoading(false)
			}
		})()
	}, [lectureId])

	// Rebuild indices and imageUrls after any reorder/delete
	const rebuildIndices = (list: Slide[], seqId: string): Slide[] =>
		list.map((s, idx) => ({
			...s,
			index: idx + 1,
			imageUrl: `${BASE_URL}/slide-sequences/${seqId}/slide/${idx + 1}`
		}))

	const persistSequence = async (list: Slide[]) => {
		if (!sequenceId) return
		try {
			setSaving(true)
			await updateSlideSequence(sequenceId, list.map(s => s.uuid))
		} catch {
			toast.error('Не удалось сохранить изменения на сервере')
		} finally {
			setSaving(false)
		}
	}

	const selectedSlide = slides.find(s => s.uuid === selectedUuid)

	const selectSlide = (s: Slide) => {
		setSelectedUuid(s.uuid)
		setCommentText(s.comment)
	}

	const deleteSlide = async (uuid: string) => {
		if (slides.length <= 1) { toast.error('Нельзя удалить последний слайд'); return }
		const next = rebuildIndices(slides.filter(s => s.uuid !== uuid), sequenceId!)
		setSlides(next)
		if (selectedUuid === uuid) {
			setSelectedUuid(next[0]?.uuid ?? null)
			setCommentText(next[0]?.comment ?? '')
		}
		toast.success('Слайд удалён')
		await persistSequence(next)
	}

	const moveSlide = async (uuid: string, dir: -1 | 1) => {
		const idx = slides.findIndex(s => s.uuid === uuid)
		if (idx + dir < 0 || idx + dir >= slides.length) return
		const next = [...slides]
		;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
		const rebuilt = rebuildIndices(next, sequenceId!)
		setSlides(rebuilt)
		await persistSequence(rebuilt)
	}

	const saveComment = () => {
		setSlides(slides.map(s => s.uuid === selectedUuid ? { ...s, comment: commentText } : s))
		toast.success('Комментарий сохранён')
	}

	const removeComment = () => {
		setCommentText('')
		setSlides(slides.map(s => s.uuid === selectedUuid ? { ...s, comment: '' } : s))
		toast.success('Комментарий удалён')
	}

	const openPreview = () => {
		setPreviewIdx(slides.findIndex(s => s.uuid === selectedUuid))
		setPreviewOpen(true)
	}

	// Full-screen preview modal
	if (previewOpen) {
		const slide = slides[previewIdx]
		return (
			<div className="fixed inset-0 bg-black z-50 flex flex-col">
				<div className="flex items-center justify-between px-4 py-3 bg-neutral-900">
					<span className="text-white text-sm">Предпросмотр — слайд {slide.index}</span>
					<div className="flex items-center gap-3">
						<span className="text-neutral-400 text-sm">{previewIdx + 1} / {slides.length}</span>
						<button onClick={() => setPreviewOpen(false)} className="text-neutral-400 hover:text-white">
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>
				<div className="flex-1 flex items-center justify-center p-6 bg-black">
					<img
						src={slide.imageUrl}
						alt={`Слайд ${slide.index}`}
						className="max-w-full max-h-full object-contain"
					/>
				</div>
				<div className="flex items-center justify-center gap-4 pb-6 bg-black">
					<button
						onClick={() => setPreviewIdx(Math.max(0, previewIdx - 1))}
						disabled={previewIdx === 0}
						className="p-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-30"
					>
						<ChevronLeft className="w-5 h-5" />
					</button>
					<div className="flex gap-1.5">
						{slides.map((_, i) => (
							<button key={i} onClick={() => setPreviewIdx(i)}
								className={`w-2.5 h-2.5 rounded-full transition-colors ${i === previewIdx ? 'bg-orange-500' : 'bg-neutral-600 hover:bg-neutral-500'}`} />
						))}
					</div>
					<button
						onClick={() => setPreviewIdx(Math.min(slides.length - 1, previewIdx + 1))}
						disabled={previewIdx === slides.length - 1}
						className="p-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-30"
					>
						<ChevronRight className="w-5 h-5" />
					</button>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center py-24">
				<Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
			</div>
		)
	}

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<div className="flex items-center gap-1 text-sm text-neutral-500 mb-1">
						<Link to="/" className="hover:text-orange-500 transition-colors">Главная</Link>
						<span>/</span>
						<span className="text-neutral-900">Менеджер слайдов</span>
					</div>
					<h1 className="mb-0">Менеджер слайдов</h1>
					<p className="text-sm text-neutral-500">{lectureName} · {slides.length} слайдов</p>
				</div>
				<div className="flex gap-2">
					<Link
						to={`/settings/${lectureId}`}
						className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
					>
						Настройки лекции
					</Link>
					{selectedSlide && (
						<button
							onClick={openPreview}
							className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm"
						>
							<Eye className="w-4 h-4" /> Предпросмотр
						</button>
					)}
				</div>
			</div>

			{loadError && (
				<div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
					<AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
					<div>
						<p className="font-medium">Не удалось загрузить слайды</p>
						<p className="mt-1 text-red-700/90">{loadError}</p>
					</div>
				</div>
			)}

			{saving && (
				<div className="mb-4 flex items-center gap-2 text-sm text-neutral-500">
					<Loader2 className="w-4 h-4 animate-spin" /> Сохраняем порядок...
				</div>
			)}

			{slides.length > 0 && (
				<>
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-sm text-blue-900">
						Используйте стрелки для перемещения слайдов. Изменения сохраняются на сервере автоматически.
					</div>

					{/* Slides Grid */}
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
						{slides.map((slide, idx) => (
							<div key={slide.uuid} onClick={() => selectSlide(slide)}
								className={`relative group cursor-pointer rounded-lg transition-all ${
									selectedUuid === slide.uuid ? 'ring-2 ring-orange-500 scale-[1.02]' : 'hover:ring-1 hover:ring-neutral-300'
								}`}
							>
								<div className="aspect-video bg-neutral-200 rounded-lg overflow-hidden">
									<img
										src={slide.imageUrl}
										alt={`Слайд ${slide.index}`}
										className="w-full h-full object-cover"
									/>
								</div>
								<div className="absolute bottom-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-xs">
									{String(idx + 1).padStart(2, '0')}
								</div>

								{slide.comment && (
									<div className="absolute top-1.5 left-1.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
										<MessageSquare className="w-3 h-3 text-white" />
									</div>
								)}

								<div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button onClick={(e) => { e.stopPropagation(); moveSlide(slide.uuid, -1) }}
										disabled={idx === 0}
										className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow hover:bg-neutral-100 disabled:opacity-30">
										<ArrowUp className="w-3 h-3" />
									</button>
									<button onClick={(e) => { e.stopPropagation(); moveSlide(slide.uuid, 1) }}
										disabled={idx === slides.length - 1}
										className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow hover:bg-neutral-100 disabled:opacity-30">
										<ArrowDown className="w-3 h-3" />
									</button>
									<button onClick={(e) => { e.stopPropagation(); deleteSlide(slide.uuid) }}
										className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50">
										<Trash2 className="w-3 h-3 text-red-600" />
									</button>
								</div>
							</div>
						))}
					</div>

					{/* Selected slide details + comment */}
					{selectedSlide && (
						<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px),1fr] gap-6">
							<div>
								<h3 className="text-sm mb-3">Слайд {selectedSlide.index}</h3>
								<div className="aspect-video bg-neutral-100 rounded-lg overflow-hidden">
									<img
										src={selectedSlide.imageUrl}
										alt={`Слайд ${selectedSlide.index}`}
										className="w-full h-full object-contain"
									/>
								</div>
							</div>

							<div className="bg-white rounded-xl p-5 border border-neutral-200">
								<div className="flex items-center gap-2 mb-4">
									<MessageSquare className="w-4 h-4 text-orange-500" />
									<h3 className="text-sm">Комментарий к слайду</h3>
								</div>
								<p className="text-xs text-neutral-500 mb-3">
									Комментарий виден только вам в режиме показа. Студенты и проектор его не видят.
								</p>
								<textarea
									value={commentText}
									onChange={(e) => setCommentText(e.target.value)}
									placeholder="Добавьте заметку для себя: что рассказать, на что обратить внимание..."
									rows={5}
									className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-3"
								/>
								<div className="flex gap-2">
									<button onClick={saveComment}
										className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
										Сохранить комментарий
									</button>
									{commentText && (
										<button onClick={removeComment}
											className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm text-neutral-600">
											Очистить
										</button>
									)}
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	)
}
