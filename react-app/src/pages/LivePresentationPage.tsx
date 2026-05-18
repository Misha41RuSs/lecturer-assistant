import {
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Clock,
	Copy,
	HelpCircle,
	Loader2,
	Lock,
	MessageSquare,
	Monitor,
	Pencil,
	QrCode,
	Send,
	Star,
	Users,
	X
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { sendLectureEvent } from '../app/api/analytics.api'
import {
	BASE_URL,
	broadcastMessage,
	broadcastSlideImage,
	getLecture,
	getLectureStudents,
	getSlideSequence,
	getStudentQuestions,
	kickLectureStudent,
	sendBroadcastReply,
	sendPrivateReply,
	stopLecture,
	StudentDto,
	updateCurrentSlide
} from '../app/api/client'
import {
	broadcastExam,
	broadcastQuestion,
	createExam,
	getExamsByLecture,
	getQuestionBank,
	QuestionDetailDto,
	sendExamToUser
} from '../app/api/quiz.api'
import {
	DrawingOverlay,
	DrawingOverlayHandle
} from '../features/DrawingOverlay'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shared/tooltip'

interface SlideData {
	id: string
	index: number
	imageUrl: string
	isQrSlide?: boolean
}

interface Question {
	id: string
	student: string
	initials: string
	time: string
	text: string
	isNew: boolean
	index: number
}

function QuizLaunchForm({
	lectureId,
	studentsCount,
	isPersonal = false,
	onLaunch
}: {
	lectureId: string
	studentsCount: number
	isPersonal?: boolean
	onLaunch: (examId: string) => void
}) {
	const [exams, setExams] = useState<{ id: string; title: string }[]>([])
	const [selectedId, setSelectedId] = useState('')

	useEffect(() => {
		getExamsByLecture(lectureId)
			.then((list: any[]) => {
				setExams(list)
				if (list.length > 0) setSelectedId(list[0].id)
			})
			.catch(() => {})
	}, [lectureId])

	return (
		<div className="space-y-3 mb-4">
			{exams.length === 0 ? (
				<p className="text-sm text-neutral-500">
					РќРµС‚ С‚РµСЃС‚РѕРІ. РЎРѕР·РґР°Р№С‚Рµ С‚РµСЃС‚ РІ СЂР°Р·РґРµР»Рµ В«РўРµСЃС‚С‹В».
				</p>
			) : (
				<select
					value={selectedId}
					onChange={e => setSelectedId(e.target.value)}
					className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
				>
					{exams.map((e: any) => (
						<option
							key={e.id}
							value={e.id}
						>
							{e.title} [{e.status}]
						</option>
					))}
				</select>
			)}
			<button
				onClick={() => {
					if (selectedId) onLaunch(selectedId)
				}}
				disabled={!selectedId}
				className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-40"
			>
				{isPersonal ? 'Р’С‹РґР°С‚СЊ Р»РёС‡РЅРѕ' : `Р—Р°РїСѓСЃС‚РёС‚СЊ РґР»СЏ РІСЃРµС… (${studentsCount})`}
			</button>
		</div>
	)
}

function mapStudentQuestion(
	q: { id: string; text: string; createdAt: string },
	idx: number
): Question {
	const created = new Date(q.createdAt)
	const mins = Math.round((Date.now() - created.getTime()) / 60000)
	const time = mins < 1 ? 'С‚РѕР»СЊРєРѕ С‡С‚Рѕ' : `${mins} РјРёРЅ.`
	const num = idx + 1
	return {
		id: q.id,
		student: `РЎС‚СѓРґРµРЅС‚ #${num}`,
		initials: `РЎ${num}`,
		time,
		text: q.text,
		isNew: mins < 2,
		index: num
	}
}

export function LivePresentationPage() {
	const navigate = useNavigate()
	const { lectureId } = useParams<{ lectureId: string }>()
	const [currentSlide, setCurrentSlide] = useState(0)
	const [slidesData, setSlidesData] = useState<SlideData[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [lectureName, setLectureName] = useState('')

	const [quickMessage, setQuickMessage] = useState('')
	const [activeTab, setActiveTab] = useState<'questions' | 'students'>(
		'questions'
	)
	const [sidebarOpen, setSidebarOpen] = useState(true)
	const [elapsed, setElapsed] = useState(0)
	const [showConfirmEnd, setShowConfirmEnd] = useState(false)
	const [replyTo, setReplyTo] = useState<string | null>(null)
	const [replyText, setReplyText] = useState('')
	const [showTestModal, setShowTestModal] = useState<number | null>(null)
	const [showAccessInfo, setShowAccessInfo] = useState(false)
	const [showSatisfactionModal, setShowSatisfactionModal] = useState(false)
	const [satisfactionPreset, setSatisfactionPreset] = useState(
		'РћС†РµРЅРёС‚Рµ Р»РµРєС†РёСЋ РѕС‚ 1 РґРѕ 5. РќР°СЃРєРѕР»СЊРєРѕ РїРѕРЅСЏС‚РЅРѕ Рё РїРѕР»РµР·РЅРѕ Р±С‹Р»Рѕ СЃРµРіРѕРґРЅСЏС€РЅРµРµ Р·Р°РЅСЏС‚РёРµ?'
	)
	const [editingSatisfaction, setEditingSatisfaction] = useState(false)
	const [satisfactionDraft, setSatisfactionDraft] = useState(satisfactionPreset)
	const [drawingActive, setDrawingActive] = useState(false)
	const [endingLecture, setEndingLecture] = useState(false)
	const [isChangingSlide, setIsChangingSlide] = useState(false)
	const [showSendQuestionModal, setShowSendQuestionModal] = useState(false)
	const [questionBank, setQuestionBank] = useState<QuestionDetailDto[]>([])
	const [selectedQuestionId, setSelectedQuestionId] = useState('')
	const [sendingQuestion, setSendingQuestion] = useState(false)

	const drawingRef = useRef<DrawingOverlayHandle>(null)
	const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

	const [accessType, setAccessType] = useState<
		'open' | 'password' | 'invitation'
	>('open')
	const [password, setPassword] = useState('')
	const telegramJoinUrl = `https://t.me/lecturer_assistant_bot?start=join_${lectureId}`
	const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(telegramJoinUrl)}`

	const [questions, setQuestions] = useState<Question[]>([])
	const [students, setStudents] = useState<StudentDto[]>([])
	const studentsCount = students.length

	// Load lecture data and slides from backend
	useEffect(() => {
		if (!lectureId) return

		const loadLecture = async () => {
			try {
				setIsLoading(true)
				const lecture = await getLecture(parseInt(lectureId))
				setLectureName(lecture.name || 'Р›РµРєС†РёСЏ')
				if (lecture.accessType === 'PASSWORD') {
					setAccessType('password')
					setPassword(lecture.password || '')
				} else if (lecture.accessType === 'INVITATION') {
					setAccessType('invitation')
					setPassword('')
				} else {
					setAccessType('open')
					setPassword('')
				}

				const seqId = lecture.sequenceId
				if (seqId) {
					const sequence = await getSlideSequence(seqId)
					const slideIds: string[] = sequence.slides || []

					const realSlides: SlideData[] = slideIds.map(
						(id: string, idx: number) => ({
							id,
							index: idx + 1,
							imageUrl: `${BASE_URL}/slide-sequences/${seqId}/slide/${idx + 1}`
						})
					)

					const isInvitation = lecture.accessType === 'INVITATION'
					const slides: SlideData[] = isInvitation
						? [
								{ id: 'qr-slide', index: 0, imageUrl: '', isQrSlide: true },
								...realSlides
							]
						: realSlides

					setSlidesData(slides)

					// QR slide starts at 0; for INVITATION always begin there on load
					if (isInvitation) {
						setCurrentSlide(0)
					} else {
						const currentSlideNum = lecture.currentSlide || 1
						setCurrentSlide(Math.max(0, currentSlideNum - 1))
					}
				}
			} catch (error) {
				console.error('Failed to load lecture:', error)
				toast.error('РћС€РёР±РєР° РїСЂРё Р·Р°РіСЂСѓР·РєРµ Р»РµРєС†РёРё')
			} finally {
				setIsLoading(false)
			}
		}

		loadLecture()
	}, [lectureId])

	// Polling РІРѕРїСЂРѕСЃРѕРІ СЃС‚СѓРґРµРЅС‚РѕРІ РёР· Р±РѕС‚Р° РєР°Р¶РґС‹Рµ 10 СЃРµРєСѓРЅРґ
	useEffect(() => {
		if (!lectureId) return
		const load = () => {
			getStudentQuestions(lectureId)
				.then(list => setQuestions(list.map(mapStudentQuestion)))
				.catch(() => {})
		}
		load()
		const interval = setInterval(load, 5000)
		return () => clearInterval(interval)
	}, [lectureId])

	// Р РµР°Р»СЊРЅРѕРµ С‡РёСЃР»Рѕ СЃС‚СѓРґРµРЅС‚РѕРІ РёР· lecture-broadcasting-service
	useEffect(() => {
		if (!lectureId) return
		const load = () => {
			getLectureStudents(lectureId)
				.then(list => setStudents(list))
				.catch(() => {})
		}
		load()
		const interval = setInterval(load, 10000)
		return () => clearInterval(interval)
	}, [lectureId])

	useEffect(() => {
		const timer = setInterval(() => setElapsed(p => p + 1), 1000)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		if (!lectureId) return
		const channel = new BroadcastChannel(`lecture-${lectureId}`)
		broadcastChannelRef.current = channel
		return () => {
			channel.close()
			broadcastChannelRef.current = null
		}
	}, [lectureId])

	const broadcastCompositeToProjector = useCallback(async (idx: number) => {
		if (!drawingRef.current) return
		const blob = await drawingRef.current.getAnnotationsBlob(idx)
		if (blob) {
			broadcastChannelRef.current?.postMessage({
				type: 'annotations-update',
				slideIndex: idx,
				blob
			})
		} else {
			broadcastChannelRef.current?.postMessage({
				type: 'slide-change',
				slideIndex: idx
			})
		}
	}, [])

	const handleAnnotationsChange = useCallback(
		(idx: number) => {
			broadcastCompositeToProjector(idx)
		},
		[broadcastCompositeToProjector]
	)

	const handleSaveToStudents = useCallback(
		async (idx: number) => {
			const slideData = slidesData[idx]
			if (!slideData || !drawingRef.current) return
			if (!drawingRef.current.hasAnnotations(idx)) {
				toast.info('РќРµС‚ СЂРёСЃСѓРЅРєРѕРІ РґР»СЏ РѕС‚РїСЂР°РІРєРё')
				return
			}
			// Telegram: full composite
			const compositeBlob = await drawingRef.current.getCompositeBlob(
				idx,
				slideData.imageUrl
			)
			if (compositeBlob) {
				try {
					await broadcastSlideImage(parseInt(lectureId!), compositeBlob)
					toast.success('РЎР»Р°Р№Рґ СЃ СЂРёСЃСѓРЅРєР°РјРё РѕС‚РїСЂР°РІР»РµРЅ СЃС‚СѓРґРµРЅС‚Р°Рј')
				} catch {
					toast.error('РћС€РёР±РєР° РїСЂРё РѕС‚РїСЂР°РІРєРµ СЃР»Р°Р№РґР°')
				}
			}
			// Projector: annotations layer
			broadcastCompositeToProjector(idx)
		},
		[slidesData, lectureId, broadcastCompositeToProjector]
	)

	useEffect(() => {
		localStorage.setItem('lecture_slide', String(currentSlide))
	}, [currentSlide])

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return
			if (e.key === 'ArrowRight' || e.key === ' ') {
				e.preventDefault()
				handleSlideChange(Math.min(currentSlide + 1, slidesData.length - 1))
			}
			if (e.key === 'ArrowLeft')
				handleSlideChange(Math.max(currentSlide - 1, 0))
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [currentSlide, slidesData.length])

	const formatTime = (s: number) =>
		`${Math.floor(s / 60)
			.toString()
			.padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
	const slide = slidesData[currentSlide]

	const handleSendMessage = async () => {
		if (!quickMessage.trim() || !lectureId) return
		try {
			await broadcastMessage(lectureId, quickMessage.trim())
			toast.success('РЎРѕРѕР±С‰РµРЅРёРµ РѕС‚РїСЂР°РІР»РµРЅРѕ РІСЃРµРј СЃС‚СѓРґРµРЅС‚Р°Рј')
			setQuickMessage('')
		} catch {
			toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ')
		}
	}

	const handleReplyToStudent = async (qId: string) => {
		if (!replyText.trim() || !lectureId) return
		const q = questions.find(x => x.id === qId)
		try {
			await sendPrivateReply(lectureId, qId, replyText)
			toast.success(`РћС‚РІРµС‚ РѕС‚РїСЂР°РІР»РµРЅ РІ Telegram: ${q?.student}`)
		} catch {
			toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РѕС‚РІРµС‚')
		}
		setQuestions(questions.filter(x => x.id !== qId))
		setReplyTo(null)
		setReplyText('')
	}

	const handleAnswerBroadcast = async (qId: string) => {
		if (!replyText.trim() || !lectureId) return
		const q = questions.find(x => x.id === qId)
		try {
			await sendBroadcastReply(lectureId, qId, replyText)
			toast.success(`РћС‚РІРµС‚ РЅР° "${q?.text}" РѕС‚РїСЂР°РІР»РµРЅ РІСЃРµРј СЃС‚СѓРґРµРЅС‚Р°Рј`)
		} catch {
			toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РѕС‚РІРµС‚')
		}
		setQuestions(questions.filter(x => x.id !== qId))
		setReplyTo(null)
		setReplyText('')
	}

	const handleDismissQuestion = (qId: string) => {
		setQuestions(questions.filter(x => x.id !== qId))
		setReplyTo(null)
		toast.info('Р’РѕРїСЂРѕСЃ РѕС‚РєР»РѕРЅС‘РЅ')
	}

	const handleAssignTestAll = async (examId: string) => {
		if (!lectureId) return
		try {
			if (showTestModal === -1) {
				await broadcastExam(examId, lectureId)
				toast.success(`РўРµСЃС‚ Р·Р°РїСѓС‰РµРЅ РґР»СЏ СЃС‚СѓРґРµРЅС‚РѕРІ (${studentsCount})`)
			} else if (showTestModal !== null) {
				await sendExamToUser(examId, showTestModal)
				toast.success(`РўРµСЃС‚ РІС‹РґР°РЅ СЃС‚СѓРґРµРЅС‚Сѓ`)
			}
		} catch {
			toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСѓСЃС‚РёС‚СЊ С‚РµСЃС‚')
		}
		setShowTestModal(null)
	}

	const handleSendSatisfaction = async () => {
		if (!lectureId) return
		try {
			const exam = await createExam({
				lectureId,
				title: 'РћРїСЂРѕСЃ РѕР± СѓРґРѕРІР»РµС‚РІРѕСЂС‘РЅРЅРѕСЃС‚Рё',
				examType: 'SURVEY',
				questions: [
					{
						text: satisfactionPreset,
						type: 'MULTIPLE',
						options: [
							{ text: '1 в­ђ', correct: false },
							{ text: '2 в­ђв­ђ', correct: false },
							{ text: '3 в­ђв­ђв­ђ', correct: false },
							{ text: '4 в­ђв­ђв­ђв­ђ', correct: false },
							{ text: '5 в­ђв­ђв­ђв­ђв­ђ', correct: false }
						]
					}
				]
			})
			await broadcastExam(exam.id, lectureId)
			toast.success(`РћРїСЂРѕСЃ Р·Р°РїСѓС‰РµРЅ РґР»СЏ СЃС‚СѓРґРµРЅС‚РѕРІ (${studentsCount})`)
		} catch {
			toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСѓСЃС‚РёС‚СЊ РѕРїСЂРѕСЃ')
		}
		setShowSatisfactionModal(false)
	}

	const handleSlideChange = async (newSlideIndex: number) => {
		if (!lectureId || isChangingSlide) return

		const newSlide = slidesData[newSlideIndex]
		if (!newSlide) return

		if (newSlide.isQrSlide) {
			setCurrentSlide(newSlideIndex)
			return
		}

		// РћРїС‚РёРјРёСЃС‚РёС‡РЅС‹Р№ update вЂ” UI СЂРµР°РіРёСЂСѓРµС‚ РјРіРЅРѕРІРµРЅРЅРѕ, РґРѕ РѕС‚РІРµС‚Р° СЃРµСЂРІРµСЂР°
		setCurrentSlide(newSlideIndex)
		localStorage.setItem('lecture_slide', String(newSlideIndex))

		if (drawingRef.current?.hasAnnotations(newSlideIndex)) {
			broadcastCompositeToProjector(newSlideIndex)
		} else {
			broadcastChannelRef.current?.postMessage({
				type: 'slide-change',
				slideIndex: newSlideIndex
			})
		}

		setIsChangingSlide(true)
		try {
			await updateCurrentSlide(parseInt(lectureId), newSlide.index.toString())
			sendLectureEvent({
				lectureId,
				actionType: 'slide_changed',
				payload: JSON.stringify({ slideNumber: newSlide.index })
			}).catch(() => {})

			if (drawingRef.current?.hasAnnotations(newSlideIndex)) {
				drawingRef.current
					.getCompositeBlob(newSlideIndex, newSlide.imageUrl)
					.then(blob => {
						if (blob)
							broadcastSlideImage(parseInt(lectureId), blob).catch(e =>
								console.error('broadcastSlideImage failed', e)
							)
					})
			}
		} catch (error) {
			console.error('Failed to update slide:', error)
			toast.error('РћС€РёР±РєР° РїСЂРё РїРµСЂРµРєР»СЋС‡РµРЅРёРё СЃР»Р°Р№РґР°')
		} finally {
			setIsChangingSlide(false)
		}
	}

	const openSendQuestionModal = () => {
		if (!lectureId) return
		getQuestionBank(parseInt(lectureId))
			.then(list => {
				setQuestionBank(list)
				setSelectedQuestionId(list.length > 0 ? list[0].id : '')
			})
			.catch(() => toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р±Р°РЅРє РІРѕРїСЂРѕСЃРѕРІ'))
		setShowSendQuestionModal(true)
	}

	const handleSendQuestion = async () => {
		if (!lectureId || !selectedQuestionId || !slide) return
		setSendingQuestion(true)
		try {
			const result = await broadcastQuestion({
				questionId: selectedQuestionId,
				lectureId: parseInt(lectureId),
				slideNumber: slide.index
			})
			const count = (result as any)?.sentTo ?? studentsCount
			toast.success(`Р’РѕРїСЂРѕСЃ РѕС‚РїСЂР°РІР»РµРЅ ${count} СЃС‚СѓРґРµРЅС‚Р°Рј`)
			setShowSendQuestionModal(false)
		} catch {
			toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РІРѕРїСЂРѕСЃ')
		} finally {
			setSendingQuestion(false)
		}
	}

	const openProjection = () => {
		window.open(
			`/projection/${lectureId}`,
			'projection',
			'width=1280,height=720'
		)
		toast.success('РћРєРЅРѕ РїСЂРѕРµРєС‚РѕСЂР° РѕС‚РєСЂС‹С‚Рѕ. РџРµСЂРµРјРµСЃС‚РёС‚Рµ РЅР° РІС‚РѕСЂРѕР№ СЌРєСЂР°РЅ.')
	}

	const handleConfirmEndLecture = async () => {
		if (!lectureId) return
		setEndingLecture(true)
		try {
			await stopLecture(parseInt(lectureId, 10))
			setShowConfirmEnd(false)
			toast.success('Р›РµРєС†РёСЏ Р·Р°РІРµСЂС€РµРЅР°, СЃС‚СѓРґРµРЅС‚С‹ РѕС‚РєР»СЋС‡РµРЅС‹')
			navigate('/')
		} catch (e) {
			console.error(e)
			toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РІРµСЂС€РёС‚СЊ Р»РµРєС†РёСЋ РЅР° СЃРµСЂРІРµСЂРµ')
		} finally {
			setEndingLecture(false)
		}
	}

	if (isLoading) {
		return (
			<div className="h-screen bg-black flex items-center justify-center">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
					<span className="text-neutral-400 text-sm">Р—Р°РіСЂСѓР·РєР° Р»РµРєС†РёРё...</span>
				</div>
			</div>
		)
	}

	if (!slide) {
		return (
			<div className="h-screen bg-black flex items-center justify-center">
				<div className="text-neutral-400 text-center">
					<p className="text-lg mb-2">РЎР»Р°Р№РґС‹ РЅРµ РЅР°Р№РґРµРЅС‹</p>
					<p className="text-sm">
						РЈР±РµРґРёС‚РµСЃСЊ, С‡С‚Рѕ Рє Р»РµРєС†РёРё РїСЂРёРІСЏР·Р°РЅР° РїСЂРµР·РµРЅС‚Р°С†РёСЏ
					</p>
					<Link
						to="/"
						className="mt-4 inline-block text-orange-500 hover:text-orange-400"
					>
						в†ђ РќР° РіР»Р°РІРЅСѓСЋ
					</Link>
				</div>
			</div>
		)
	}

	return (
		<div className="h-screen bg-black flex flex-col">
			{/* Top Bar */}
			<div className="bg-neutral-900 px-3 sm:px-6 py-3 flex items-center justify-between border-b border-neutral-800 flex-shrink-0">
				<div className="flex items-center gap-3 min-w-0">
					<span className="text-orange-500 hidden sm:block text-sm">
						LectureApp
					</span>
					<span className="text-white text-sm truncate">{lectureName}</span>
					<span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
						<span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />{' '}
						LIVE
					</span>
				</div>
				<div className="flex items-center gap-2 sm:gap-3">
					<span className="hidden sm:flex items-center gap-1.5 text-neutral-400 text-sm">
						<Clock className="w-3.5 h-3.5" />
						{formatTime(elapsed)}
					</span>
					<span className="flex items-center gap-1.5 text-neutral-400 text-sm">
						<Users className="w-3.5 h-3.5" />
						{studentsCount}
					</span>

					{(accessType === 'password' || accessType === 'invitation') && (
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									onClick={() => setShowAccessInfo(!showAccessInfo)}
									className="flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-300 rounded text-xs hover:bg-neutral-700"
								>
									{accessType === 'password' ? (
										<Lock className="w-3 h-3" />
									) : (
										<QrCode className="w-3 h-3" />
									)}
									<span className="hidden sm:inline">
										{accessType === 'password' ? password : 'QR'}
									</span>
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>
									{accessType === 'password'
										? 'РџРѕРєР°Р·Р°С‚СЊ РїР°СЂРѕР»СЊ РґР»СЏ РїРѕРґРєР»СЋС‡РµРЅРёСЏ'
										: 'РџРѕРєР°Р·Р°С‚СЊ QR-РєРѕРґ РґР»СЏ РїРѕРґРєР»СЋС‡РµРЅРёСЏ'}
								</p>
							</TooltipContent>
						</Tooltip>
					)}

					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={openProjection}
								className="flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-300 rounded text-xs hover:bg-neutral-700"
								title="РћС‚РєСЂС‹РІР°РµС‚ РѕС‚РґРµР»СЊРЅРѕРµ РѕРєРЅРѕ СЃ С‡РёСЃС‚С‹Рј СЃР»Р°Р№РґРѕРј РґР»СЏ РїСЂРѕРµРєС‚РѕСЂР°"
							>
								<Monitor className="w-3 h-3" />{' '}
								<span className="hidden sm:inline">РџСЂРѕРµРєС‚РѕСЂ</span>
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>РћС‚РєСЂС‹С‚СЊ РѕРєРЅРѕ РїСЂРѕРµРєС‚РѕСЂР°</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => setDrawingActive(!drawingActive)}
								className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${drawingActive ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
								title="Р РёСЃРѕРІР°РЅРёРµ РїРѕРІРµСЂС… СЃР»Р°Р№РґР°"
							>
								<Pencil className="w-3 h-3" />{' '}
								<span className="hidden sm:inline">
									{drawingActive ? 'Р РёСЃРѕРІР°РЅРёРµ Р’РљР›' : 'Р РёСЃРѕРІР°С‚СЊ'}
								</span>
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								{drawingActive
									? 'РћС‚РєР»СЋС‡РёС‚СЊ СЂРёСЃРѕРІР°РЅРёРµ'
									: 'Р’РєР»СЋС‡РёС‚СЊ СЂРёСЃРѕРІР°РЅРёРµ РЅР° СЃР»Р°Р№РґРµ'}
							</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={openSendQuestionModal}
								disabled={!slide || slide.isQrSlide}
								className="flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-300 rounded text-xs hover:bg-neutral-700 disabled:opacity-30"
							>
								<HelpCircle className="w-3 h-3" />{' '}
								<span className="hidden sm:inline">Вопрос</span>
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Отправить вопрос к этому слайду</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => setSidebarOpen(!sidebarOpen)}
								className="p-1.5 text-neutral-400 hover:text-white hidden lg:block"
							>
								<MessageSquare className="w-4 h-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								{sidebarOpen
									? 'РЎРєСЂС‹С‚СЊ С‡Р°С‚ СЃ РІРѕРїСЂРѕСЃР°РјРё'
									: 'РџРѕРєР°Р·Р°С‚СЊ С‡Р°С‚ СЃ РІРѕРїСЂРѕСЃР°РјРё'}
							</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => setShowConfirmEnd(true)}
								className="bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 text-sm"
							>
								Р—Р°РІРµСЂС€РёС‚СЊ
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Р—Р°РІРµСЂС€РёС‚СЊ Р»РµРєС†РёСЋ</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{/* Access info popup */}
			{showAccessInfo && (
				<div className="absolute top-14 right-4 z-50 bg-white rounded-xl shadow-2xl border border-neutral-200 p-4 w-72">
					<div className="flex items-center justify-between mb-3">
						<span className="text-sm">
							{accessType === 'password'
								? 'РџР°СЂРѕР»СЊ РґР»СЏ РїРѕРґРєР»СЋС‡РµРЅРёСЏ'
								: 'РџРѕРґРєР»СЋС‡РµРЅРёРµ РїРѕ QR'}
						</span>
						<button onClick={() => setShowAccessInfo(false)}>
							<X className="w-4 h-4 text-neutral-400" />
						</button>
					</div>
					{accessType === 'password' && (
						<>
							<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center mb-2">
								<div className="text-2xl tracking-wider text-orange-700">
									{password}
								</div>
							</div>
							<button
								onClick={() => {
									navigator.clipboard.writeText(password)
									toast.success('РЎРєРѕРїРёСЂРѕРІР°РЅРѕ')
								}}
								className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 mx-auto"
							>
								<Copy className="w-3.5 h-3.5" /> РљРѕРїРёСЂРѕРІР°С‚СЊ
							</button>
						</>
					)}
					{accessType === 'invitation' && (
						<div className="text-center">
							<div className="bg-white border border-neutral-200 rounded-lg p-3 inline-block mb-2">
								<img
									src={qrUrl}
									alt="QR"
									className="w-40 h-40"
								/>
							</div>
							<p className="text-xs text-neutral-500">РџРѕРєР°Р¶РёС‚Рµ СЃС‚СѓРґРµРЅС‚Р°Рј</p>
						</div>
					)}
				</div>
			)}

			{/* End confirmation */}
			{showConfirmEnd && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-xl p-6 max-w-sm w-full">
						<h3 className="mb-2">Р—Р°РІРµСЂС€РёС‚СЊ Р»РµРєС†РёСЋ?</h3>
						<p className="text-sm text-neutral-500 mb-4">
							Р’СЃРµ СЃС‚СѓРґРµРЅС‚С‹ Р±СѓРґСѓС‚ РѕС‚РєР»СЋС‡РµРЅС‹.
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								disabled={endingLecture}
								onClick={() => setShowConfirmEnd(false)}
								className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm"
							>
								РћС‚РјРµРЅР°
							</button>
							<button
								type="button"
								disabled={endingLecture}
								onClick={handleConfirmEndLecture}
								className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-center text-sm hover:bg-red-700 disabled:opacity-60"
							>
								{endingLecture ? 'Р—Р°РІРµСЂС€РµРЅРёРµвЂ¦' : 'Р—Р°РІРµСЂС€РёС‚СЊ'}
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="flex-1 flex overflow-hidden">
				{/* Main area */}
				<div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-w-0">
					<div className="w-full max-w-5xl">
						{/* Slide */}
						<div className="relative">
							<div className="aspect-video bg-neutral-900 rounded-lg shadow-2xl overflow-hidden flex items-center justify-center">
								{slide.isQrSlide ? (
									<div className="flex flex-col items-center justify-center gap-4 text-white p-8">
										<div className="bg-white rounded-2xl p-4">
											<img
												src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`https://t.me/lecturer_assistant_bot?start=join_${lectureId}`)}`}
												alt="QR РґР»СЏ РїРѕРґРєР»СЋС‡РµРЅРёСЏ"
												className="w-48 h-48"
											/>
										</div>
										<p className="text-lg font-medium">
											РћС‚СЃРєР°РЅРёСЂСѓР№С‚Рµ РґР»СЏ РїРѕРґРєР»СЋС‡РµРЅРёСЏ
										</p>
										<p className="text-sm text-neutral-400">
											РёР»Рё РЅР°РїРёС€РёС‚Рµ Р±РѕС‚Сѓ:{' '}
											<span className="font-mono text-orange-400">
												/join {lectureId}
											</span>
										</p>
									</div>
								) : (
									<img
										src={slide.imageUrl}
										alt={`РЎР»Р°Р№Рґ ${slide.index}`}
										className="w-full h-full object-contain"
									/>
								)}
							</div>
							{!slide.isQrSlide && (
								<DrawingOverlay
									ref={drawingRef}
									slideIndex={currentSlide}
									active={drawingActive}
									onToggle={() => setDrawingActive(!drawingActive)}
									onAnnotationsChange={handleAnnotationsChange}
									onSave={handleSaveToStudents}
								/>
							)}
						</div>

						{/* Nav */}
						<div className="flex items-center justify-between mt-4">
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										onClick={() =>
											handleSlideChange(Math.max(0, currentSlide - 1))
										}
										disabled={currentSlide === 0 || isChangingSlide}
										className="p-2 sm:px-4 sm:py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-30"
									>
										<ChevronLeft className="w-5 h-5" />
									</button>
								</TooltipTrigger>
								<TooltipContent>
									<p>РџСЂРµРґС‹РґСѓС‰РёР№ СЃР»Р°Р№Рґ</p>
								</TooltipContent>
							</Tooltip>
							<span className="text-white text-sm bg-neutral-800 px-3 py-1.5 rounded-lg">
								{currentSlide + 1} / {slidesData.length}
							</span>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										onClick={() =>
											handleSlideChange(
												Math.min(slidesData.length - 1, currentSlide + 1)
											)
										}
										disabled={currentSlide === slidesData.length - 1 || isChangingSlide}
										className="p-2 sm:px-4 sm:py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-30"
									>
										<ChevronRight className="w-5 h-5" />
									</button>
								</TooltipTrigger>
								<TooltipContent>
									<p>РЎР»РµРґСѓСЋС‰РёР№ СЃР»Р°Р№Рґ</p>
								</TooltipContent>
							</Tooltip>
						</div>

						{/* Thumbnails */}
						<div className="flex gap-2 mt-4 overflow-x-auto pb-2">
							{slidesData.map((s, i) => (
								<button
									key={s.id}
									onClick={() => handleSlideChange(i)}
									disabled={isChangingSlide}
									className={`flex-shrink-0 w-20 aspect-video bg-neutral-800 rounded border-2 transition-all relative overflow-hidden ${
										i === currentSlide
											? 'border-orange-500 scale-105'
											: 'border-neutral-700 opacity-50 hover:opacity-80 disabled:cursor-wait'
									}`}
								>
									{s.isQrSlide ? (
										<div className="w-full h-full flex items-center justify-center bg-neutral-700">
											<QrCode className="w-5 h-5 text-white opacity-60" />
										</div>
									) : (
										<img
											src={s.imageUrl}
											alt={`РЎР»Р°Р№Рґ ${s.index}`}
											loading="lazy"
											className="w-full h-full object-cover"
										/>
									)}
									<div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] py-0.5 text-center">
										{s.isQrSlide ? 'QR' : s.index}
									</div>
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Sidebar */}
				{sidebarOpen && (
					<div className="hidden lg:flex w-[340px] xl:w-[380px] bg-neutral-900 border-l border-neutral-800 flex-col flex-shrink-0">
						<div className="flex border-b border-neutral-800">
							{(['questions', 'students'] as const).map(tab => (
								<button
									key={tab}
									onClick={() => setActiveTab(tab)}
									className={`flex-1 px-3 py-2.5 text-sm transition-colors relative ${
										activeTab === tab
											? 'text-orange-500'
											: 'text-neutral-400 hover:text-white'
									}`}
								>
									{tab === 'questions'
										? `Р’РѕРїСЂРѕСЃС‹ (${questions.length})`
										: `РЎС‚СѓРґРµРЅС‚С‹ (${studentsCount})`}
									{activeTab === tab && (
										<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
									)}
								</button>
							))}
						</div>

						<div className="flex-1 overflow-y-auto p-3">
							{activeTab === 'questions' ? (
								questions.length === 0 ? (
									<div className="text-neutral-500 text-sm text-center py-8">
										РќРµС‚ РІРѕРїСЂРѕСЃРѕРІ
									</div>
								) : (
									<div className="space-y-2">
										{questions.map(q => (
											<div
												key={q.id}
												className="bg-neutral-800 rounded-lg p-3"
											>
												<div className="flex items-start gap-2 mb-2">
													<div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs text-white flex-shrink-0">
														{q.initials}
													</div>
													<div className="flex-1 min-w-0">
														<div className="flex items-center justify-between mb-0.5">
															<span className="text-white text-sm truncate">
																{q.student}
															</span>
															{q.isNew && (
																<span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">
																	РќРѕРІС‹Р№
																</span>
															)}
														</div>
														<div className="text-neutral-400 text-xs">
															{q.time}
														</div>
													</div>
												</div>
												<p className="text-neutral-300 text-sm mb-2">
													{q.text}
												</p>

												{replyTo === q.id ? (
													<div className="space-y-2">
														<textarea
															value={replyText}
															onChange={e => setReplyText(e.target.value)}
															placeholder="Р’РІРµРґРёС‚Рµ РѕС‚РІРµС‚..."
															className="w-full px-3 py-2 bg-neutral-700 text-white border border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
															rows={2}
														/>
														<div className="flex gap-1">
															<button
																onClick={() => handleReplyToStudent(q.id)}
																className="flex-1 px-2 py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
															>
																Р›РёС‡РЅРѕ
															</button>
															<button
																onClick={() => handleAnswerBroadcast(q.id)}
																className="flex-1 px-2 py-1.5 bg-neutral-600 text-white text-xs rounded hover:bg-neutral-500"
															>
																Р’СЃРµРј
															</button>
															<button
																onClick={() => {
																	setReplyTo(null)
																	setReplyText('')
																}}
																className="px-2 py-1.5 text-neutral-400 text-xs hover:text-white"
															>
																вњ•
															</button>
														</div>
													</div>
												) : (
													<div className="flex gap-1">
														<button
															onClick={() => {
																setReplyTo(q.id)
																setReplyText('')
															}}
															className="flex-1 px-3 py-1.5 bg-neutral-700 text-white text-sm rounded hover:bg-neutral-600"
														>
															РћС‚РІРµС‚РёС‚СЊ
														</button>
														<button
															onClick={() => handleDismissQuestion(q.id)}
															className="px-2 py-1.5 text-neutral-500 hover:text-red-400 text-sm"
														>
															<X className="w-4 h-4" />
														</button>
													</div>
												)}
											</div>
										))}
									</div>
								)
							) : (
								<div className="flex flex-col h-full">
									{students.length === 0 ? (
										<div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4 py-8">
											<Users className="w-10 h-10 text-neutral-600" />
											<div className="text-neutral-500 text-sm">
												РџРѕРєР° РЅРёРєС‚Рѕ РЅРµ РїРѕРґРєР»СЋС‡РёР»СЃСЏ
											</div>
										</div>
									) : (
										<div className="flex-1 overflow-y-auto space-y-2 mb-3">
											{students.map(s => (
												<div
													key={s.chatId}
													className="bg-neutral-800 rounded-lg p-3 flex flex-col gap-2 border border-neutral-700"
												>
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-2 min-w-0">
															<div className="w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
																{s.firstName?.[0] || 'РЎ'}
															</div>
															<div className="min-w-0">
																<div className="text-white text-sm font-medium truncate">
																	{s.firstName
																		? `${s.firstName} ${s.lastName || ''}`
																		: `РЎС‚СѓРґРµРЅС‚`}
																</div>
																<div className="text-orange-400/80 text-xs truncate">
																	{s.username
																		? `@${s.username}`
																		: `ID: ${s.chatId}`}
																</div>
															</div>
														</div>
														<button
															onClick={async () => {
																if (
																	!window.confirm(
																		'Р’С‹РіРЅР°С‚СЊ СЃС‚СѓРґРµРЅС‚Р° РёР· Р»РµРєС†РёРё? РћРЅ Р±РѕР»СЊС€Рµ РЅРµ СЃРјРѕР¶РµС‚ Р·Р°Р№С‚Рё.'
																	)
																)
																	return
																try {
																	await kickLectureStudent(lectureId!, s.chatId)
																	setStudents(prev =>
																		prev.filter(x => x.chatId !== s.chatId)
																	)
																	toast.success('РЎС‚СѓРґРµРЅС‚ РѕС‚РєР»СЋС‡РµРЅ')
																} catch (e) {
																	toast.error('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєР»СЋС‡РёС‚СЊ СЃС‚СѓРґРµРЅС‚Р°')
																}
															}}
															className="p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors"
															title="Р’С‹РіРЅР°С‚СЊ РёР· Р»РµРєС†РёРё"
														>
															<X className="w-4 h-4" />
														</button>
													</div>
													<div className="flex mt-1">
														<button
															onClick={() => setShowTestModal(s.chatId)}
															className="w-full justify-center flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-medium rounded transition-colors"
														>
															<ClipboardList className="w-3.5 h-3.5" />
															Р’С‹РґР°С‚СЊ С‚РµСЃС‚ Р»РёС‡РЅРѕ
														</button>
													</div>
												</div>
											))}
										</div>
									)}

									{/* Action buttons */}
									<div className="pt-3 border-t border-neutral-800 space-y-2">
										<button
											onClick={() => setShowTestModal(-1)}
											className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
										>
											<ClipboardList className="w-4 h-4" /> Р—Р°РїСѓСЃС‚РёС‚СЊ РєРІРёР·
										</button>
										<button
											onClick={() => setShowSatisfactionModal(true)}
											className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 text-sm"
										>
											<Star className="w-4 h-4" /> РЈР·РЅР°С‚СЊ РјРЅРµРЅРёРµ
										</button>
									</div>
								</div>
							)}
						</div>

						{/* Quick message */}
						<div className="p-3 border-t border-neutral-800">
							<div className="text-neutral-400 text-xs mb-1.5">
								РЎРѕРѕР±С‰РµРЅРёРµ РІСЃРµРј СЃС‚СѓРґРµРЅС‚Р°Рј
							</div>
							<div className="flex gap-2">
								<input
									type="text"
									value={quickMessage}
									onChange={e => setQuickMessage(e.target.value)}
									onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
									placeholder="РќР°РїРёСЃР°С‚СЊ..."
									className="flex-1 px-3 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
								/>
								<button
									onClick={handleSendMessage}
									className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600"
								>
									<Send className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Test assignment modal */}
			{showTestModal !== null && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-xl p-6 max-w-sm w-full max-h-[80vh] flex flex-col">
						<h3 className="mb-1">
							{showTestModal === -1
								? 'Р—Р°РїСѓСЃС‚РёС‚СЊ РєРІРёР· РґР»СЏ РІСЃРµС…'
								: 'Р’С‹РґР°С‚СЊ С‚РµСЃС‚ СЃС‚СѓРґРµРЅС‚Сѓ'}
						</h3>
						<p className="text-sm text-neutral-500 mb-4">
							{showTestModal === -1
								? 'Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ РєРІРёР·Р° вЂ” РІСЃРµ СЃС‚СѓРґРµРЅС‚С‹ РїРѕР»СѓС‡Р°С‚ РµРіРѕ С‡РµСЂРµР· Telegram-Р±РѕС‚.'
								: 'Р’С‹Р±РµСЂРёС‚Рµ С‚РµСЃС‚. РћРЅ Р±СѓРґРµС‚ РѕС‚РїСЂР°РІР»РµРЅ С‚РѕР»СЊРєРѕ СЌС‚РѕРјСѓ СЃС‚СѓРґРµРЅС‚Сѓ.'}
						</p>
						<QuizLaunchForm
							lectureId={lectureId!}
							studentsCount={studentsCount}
							isPersonal={showTestModal !== -1}
							onLaunch={handleAssignTestAll}
						/>
						<button
							onClick={() => setShowTestModal(null)}
							className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm mt-auto"
						>
							РћС‚РјРµРЅР°
						</button>
					</div>
				</div>
			)}

			{/* Satisfaction poll modal */}
			{showSatisfactionModal && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-xl p-6 max-w-md w-full">
						<div className="flex items-center gap-2 mb-4">
							<Star className="w-5 h-5 text-orange-500" />
							<h3 className="mb-0">РЈР·РЅР°С‚СЊ РјРЅРµРЅРёРµ</h3>
						</div>
						<p className="text-sm text-neutral-500 mb-4">
							РЎС‚СѓРґРµРЅС‚С‹ РїРѕР»СѓС‡Р°С‚ РІРѕРїСЂРѕСЃ Рё РѕС†РµРЅСЏС‚ Р»РµРєС†РёСЋ РїРѕ С€РєР°Р»Рµ 1вЂ“5. РќР° РѕСЃРЅРѕРІРµ
							РѕС†РµРЅРѕРє СЂР°СЃСЃС‡РёС‚С‹РІР°РµС‚СЃСЏ РїСЂРѕС†РµРЅС‚ СѓРґРѕРІР»РµС‚РІРѕСЂС‘РЅРЅРѕСЃС‚Рё.
						</p>

						<div className="mb-4">
							<div className="flex items-center justify-between mb-1.5">
								<label className="text-sm">РўРµРєСЃС‚ РІРѕРїСЂРѕСЃР°</label>
								{!editingSatisfaction && (
									<button
										onClick={() => {
											setEditingSatisfaction(true)
											setSatisfactionDraft(satisfactionPreset)
										}}
										className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600"
									>
										<Pencil className="w-3 h-3" /> Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ
									</button>
								)}
							</div>

							{editingSatisfaction ? (
								<div className="space-y-2">
									<textarea
										value={satisfactionDraft}
										onChange={e => setSatisfactionDraft(e.target.value)}
										rows={3}
										className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
									/>
									<div className="flex gap-2">
										<button
											onClick={() => {
												setSatisfactionPreset(satisfactionDraft)
												setEditingSatisfaction(false)
												toast.success('РџСЂРµСЃРµС‚ РѕР±РЅРѕРІР»С‘РЅ')
											}}
											className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
										>
											РЎРѕС…СЂР°РЅРёС‚СЊ
										</button>
										<button
											onClick={() => setEditingSatisfaction(false)}
											className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
										>
											РћС‚РјРµРЅР°
										</button>
									</div>
								</div>
							) : (
								<div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm">
									{satisfactionPreset}
								</div>
							)}
						</div>

						<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
							<div className="flex items-center gap-1 mb-1">
								{[1, 2, 3, 4, 5].map(n => (
									<Star
										key={n}
										className="w-5 h-5 text-orange-400 fill-orange-400"
									/>
								))}
							</div>
							<p className="text-xs text-orange-700">
								РЎС‚СѓРґРµРЅС‚С‹ РІС‹Р±РµСЂСѓС‚ РѕС†РµРЅРєСѓ РѕС‚ 1 РґРѕ 5
							</p>
						</div>

						<div className="flex gap-2">
							<button
								onClick={() => setShowSatisfactionModal(false)}
								className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm"
							>
								РћС‚РјРµРЅР°
							</button>
							<button
								onClick={handleSendSatisfaction}
								className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
							>
								РћС‚РїСЂР°РІРёС‚СЊ ({studentsCount})
							</button>
						</div>
					</div>
				</div>
			)}
			{/* Send question to slide modal */}
			{showSendQuestionModal && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-xl p-6 max-w-sm w-full max-h-[80vh] flex flex-col">
						<div className="flex items-center justify-between mb-1">
							<h3 className="mb-0">Вопрос к слайду {slide?.index}</h3>
							<button onClick={() => setShowSendQuestionModal(false)}>
								<X className="w-4 h-4 text-neutral-400" />
							</button>
						</div>
						<p className="text-sm text-neutral-500 mb-4">
							Выберите вопрос из банка — он будет отправлен студентам через бот.
						</p>
						{questionBank.length === 0 ? (
							<p className="text-sm text-neutral-500 py-4 text-center">
								Нет вопросов. Создайте вопросы в разделе «Тесты».
							</p>
						) : (
							<div className="flex-1 overflow-y-auto space-y-2 mb-4">
								{questionBank.map(q => (
									<button
										key={q.id}
										onClick={() => setSelectedQuestionId(q.id)}
										className={`w-full text-left px-3 py-2.5 rounded-lg border-2 text-sm transition-colors ${
									selectedQuestionId === q.id
										? 'border-orange-500 bg-orange-50'
										: 'border-neutral-200 hover:border-neutral-300'
								}`}
									>
										<div className="font-medium text-neutral-800 mb-0.5 line-clamp-2">{q.text}</div>
										<div className="text-xs text-neutral-500">
											{q.type === 'MULTIPLE' ? `Выбор ответа · ${q.options.length} вар.` : 'Открытый ответ'}
										</div>
									</button>
								))}
							</div>
						)}
						<div className="flex gap-2 mt-auto">
							<button
								onClick={() => setShowSendQuestionModal(false)}
								className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm"
							>
								Отмена
							</button>
							<button
								onClick={handleSendQuestion}
								disabled={!selectedQuestionId || sendingQuestion}
								className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm disabled:opacity-40"
							>
								{sendingQuestion ? 'Отправка…' : `Отправить (${studentsCount})`}
							</button>
						</div>
					</div>
				</div>
			)}

		</div>
	)
}
