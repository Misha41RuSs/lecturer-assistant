import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Clock,
	Copy,
	Loader2,
	Lock,
	MessageSquare,
	Monitor,
	NotebookPen,
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
import { sendLectureEvent, sendXapiSlideShown } from '../app/api/analytics.api'
import {
	BASE_URL,
	broadcastMessage,
	broadcastSlideImage,
	createStompTopicSocket,
	dismissStudentQuestion,
	getLecture,
	getLectureStudents,
	getCurrentComprehension,
	getSlideSequence,
	getStudentQuestions,
	kickLectureStudent,
	markStudentQuestionsSeen,
	sendBroadcastReply,
	sendPrivateReply,
	stopLecture,
	StudentDto,
	updateCurrentSlide
} from '../app/api/client'
import {
	broadcastExam,
	closeExam,
	createExam,
	getExam,
	getExamSubmissions,
	getExamsByLecture,
	sendExamToUser
} from '../app/api/quiz.api'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../shared/alert-dialog'
import {
	DrawingOverlay,
	DrawingOverlayHandle
} from '../features/DrawingOverlay'
import { QRCodeSVG } from 'qrcode.react'
import { SlideNotesPanel } from '../features/SlideNotesPanel'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shared/tooltip'

interface SlideData {
	id: string
	index: number
	imageUrl: string
	isQrSlide?: boolean
}

interface ComprehensionAggregate {
	slideIndex: number
	totalResponses: number
	green: { count: number; pct: number }
	yellow: { count: number; pct: number }
	red: { count: number; pct: number }
}

interface Question {
	id: string
	student: string
	initials: string
	time: string
	text: string
	answer?: string | null
	status: 'OPEN' | 'SEEN' | 'ANSWERED' | 'DISMISSED'
	isNew: boolean
	index: number
	upvotes: number
}

interface LiveExamOption {
	id: string
	text: string
	correct: boolean
}

interface LiveExamQuestion {
	id: string
	text: string
	type: 'MULTIPLE' | 'OPEN'
	timeLimitSec?: number | null
	options?: LiveExamOption[]
}

interface LivePollState {
	examId: string
	title: string
	questionText: string
	questionType: 'MULTIPLE' | 'OPEN'
	correctAnswer?: string
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
					Нет тестов. Создайте тест в разделе «Тесты».
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
				{isPersonal ? 'Выдать лично' : `Запустить для всех (${studentsCount})`}
			</button>
		</div>
	)
}

function questionInitials(name: string): string {
	const normalized = name.replace(/^@/, '').trim()
	if (!normalized) return '?'
	const parts = normalized.split(/\s+/).filter(Boolean)
	if (parts.length > 1) {
		return (parts[0][0] + parts[1][0]).toUpperCase()
	}
	return normalized.slice(0, 2).toUpperCase()
}

function mapStudentQuestion(
	q: {
		id: string
		text: string
		answer?: string | null
		status?: 'OPEN' | 'SEEN' | 'ANSWERED' | 'DISMISSED'
		createdAt: string
		chatId?: number
		realName?: string
		groupName?: string
		studentName?: string
		username?: string
		upvotes?: number
	},
	idx: number
): Question {
	const created = new Date(q.createdAt)
	const mins = Math.round((Date.now() - created.getTime()) / 60000)
	const time = mins < 1 ? 'только что' : `${mins} мин.`
	const num = idx + 1
	const student =
		q.realName ||
		q.studentName ||
		(q.username
			? `@${q.username}`
			: q.chatId
				? `ID: ${q.chatId}`
				: `Анонимный вопрос #${num}`)
	return {
		id: q.id,
		student,
		initials: questionInitials(student),
		time,
		text: q.text,
		answer: q.answer,
		status: q.status || 'OPEN',
		isNew: mins < 2,
		index: num,
		upvotes: q.upvotes || 0
	}
}

const isLivePollExam = (exam: { title?: string }) =>
	exam.title?.startsWith('Быстрый вопрос:') ?? false

export function LivePresentationPage() {
	const navigate = useNavigate()
	const { lectureId } = useParams<{ lectureId: string }>()
	const [currentSlide, setCurrentSlide] = useState(0)
	const [slidesData, setSlidesData] = useState<SlideData[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [lectureName, setLectureName] = useState('')
	const [lectureStatus, setLectureStatus] = useState('')
	const [comprehension, setComprehension] = useState<ComprehensionAggregate | null>(null)

	const [quickMessage, setQuickMessage] = useState('')
	const [activeTab, setActiveTab] = useState<'questions' | 'polls' | 'students'>(
		'questions'
	)
	const [questionView, setQuestionView] = useState<'active' | 'archive'>(
		'active'
	)
	const [sidebarOpen, setSidebarOpen] = useState(() =>
		typeof window === 'undefined' ? true : window.innerWidth >= 1024
	)
	const [elapsed, setElapsed] = useState(0)
	const [slideElapsed, setSlideElapsed] = useState(0)
	const [showConfirmEnd, setShowConfirmEnd] = useState(false)
	const [showConfirmExit, setShowConfirmExit] = useState(false)
	const [replyTo, setReplyTo] = useState<string | null>(null)
	const [replyText, setReplyText] = useState('')
	const [showTestModal, setShowTestModal] = useState<number | null>(null)
	const [showAccessInfo, setShowAccessInfo] = useState(false)
	const [showSatisfactionModal, setShowSatisfactionModal] = useState(false)
	const [satisfactionPreset, setSatisfactionPreset] = useState(
		'Оцените лекцию от 1 до 5. Насколько понятно и полезно было сегодняшнее занятие?'
	)
	const [editingSatisfaction, setEditingSatisfaction] = useState(false)
	const [satisfactionDraft, setSatisfactionDraft] = useState(satisfactionPreset)
	const [drawingActive, setDrawingActive] = useState(false)
	const [endingLecture, setEndingLecture] = useState(false)
	const [isChangingSlide, setIsChangingSlide] = useState(false)
	const [showNotes, setShowNotes] = useState(false)
	const [isMessageCoolingDown, setIsMessageCoolingDown] = useState(false)
	const [kickTarget, setKickTarget] = useState<StudentDto | null>(null)
	const [kickingChatId, setKickingChatId] = useState<number | null>(null)

	const drawingRef = useRef<DrawingOverlayHandle>(null)
	const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

	const [accessType, setAccessType] = useState<
		'open' | 'password' | 'invitation'
	>('open')
	const [password, setPassword] = useState('')
	const telegramJoinUrl = `https://t.me/lecturer_assistant_bot?start=join_${lectureId}`

	const [questions, setQuestions] = useState<Question[]>([])
	const [students, setStudents] = useState<StudentDto[]>([])
	const studentsCount = students.length
	const isActiveQuestion = (q: Question) =>
		q.status === 'OPEN' || q.status === 'SEEN'
	const activeQuestions = questions.filter(isActiveQuestion)
	const archivedQuestions = questions.filter(q => !isActiveQuestion(q))
	const visibleQuestions =
		questionView === 'active' ? activeQuestions : archivedQuestions
	const [bankExams, setBankExams] = useState<{ id: string; title: string; status?: string }[]>([])
	const [selectedBankExamId, setSelectedBankExamId] = useState('')
	const [bankQuestions, setBankQuestions] = useState<LiveExamQuestion[]>([])
	const [loadingBankQuestions, setLoadingBankQuestions] = useState(false)
	const [launchingQuestionId, setLaunchingQuestionId] = useState<string | null>(null)
	const [livePoll, setLivePoll] = useState<LivePollState | null>(null)
	const [livePollSubmissions, setLivePollSubmissions] = useState<any[]>([])

	// Load lecture data and slides from backend
	useEffect(() => {
		if (!lectureId) return

		const loadLecture = async () => {
			try {
				setIsLoading(true)
				const lecture = await getLecture(parseInt(lectureId))
				setLectureName(lecture.name || 'Лекция')
				setLectureStatus(lecture.status || '')
				if (lecture.accessType === 'PASSWORD') {
					setAccessType('password')
					setPassword('')
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
				toast.error('Ошибка при загрузке лекции')
			} finally {
				setIsLoading(false)
			}
		}

		loadLecture()
	}, [lectureId])

	useEffect(() => {
		const handler = (e: BeforeUnloadEvent) => {
			if (lectureStatus !== 'ACTIVE') return
			e.preventDefault()
			e.returnValue = ''
		}
		window.addEventListener('beforeunload', handler)
		return () => window.removeEventListener('beforeunload', handler)
	}, [lectureStatus])

	// Вопросы студентов: начальная загрузка + WS + polling-fallback каждые 5 сек
	useEffect(() => {
		if (!lectureId) return
		let cancelled = false
		const load = () => {
			getStudentQuestions(lectureId)
				.then(list => {
					if (!cancelled) setQuestions(list.map(mapStudentQuestion))
				})
				.catch(() => {})
		}
		load()
		const socket = createStompTopicSocket(
			`/topic/student-questions/${lectureId}`,
			load
		)
		const poll = setInterval(load, 5000)
		return () => {
			cancelled = true
			socket.close()
			clearInterval(poll)
		}
	}, [lectureId])

	useEffect(() => {
		if (!lectureId || activeTab !== 'questions' || !sidebarOpen) return
		if (!activeQuestions.some(q => q.status === 'OPEN')) return
		markStudentQuestionsSeen(lectureId).catch(() => {})
	}, [lectureId, activeTab, sidebarOpen, activeQuestions.length])

	useEffect(() => {
		if (!lectureId) return
		let cancelled = false
		const load = () => {
			getCurrentComprehension(lectureId)
				.then(data => {
					if (!cancelled) setComprehension(data)
				})
				.catch(() => {})
		}
		load()
		const socket = createStompTopicSocket(
			`/topic/comprehension/${lectureId}`,
			data => setComprehension(data)
		)
		return () => {
			cancelled = true
			socket.close()
		}
	}, [lectureId, currentSlide])

	// Реальное число студентов из lecture-broadcasting-service
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
		if (!lectureId) return
		getExamsByLecture(lectureId)
			.then((list: any[]) => {
				const reusableExams = list.filter(exam => !isLivePollExam(exam))
				setBankExams(reusableExams)
				if (reusableExams.length > 0)
					setSelectedBankExamId(current => current || reusableExams[0].id)
			})
			.catch(() => {})
	}, [lectureId])

	useEffect(() => {
		if (!selectedBankExamId) {
			setBankQuestions([])
			return
		}
		setLoadingBankQuestions(true)
		getExam(selectedBankExamId)
			.then((exam: any) => setBankQuestions(exam.questions || []))
			.catch(() => {
				setBankQuestions([])
				toast.error('Не удалось загрузить вопросы теста')
			})
			.finally(() => setLoadingBankQuestions(false))
	}, [selectedBankExamId])

	useEffect(() => {
		if (!livePoll) return
		let cancelled = false
		const load = () => {
			getExamSubmissions(livePoll.examId)
				.then((list: any[]) => {
					if (!cancelled) setLivePollSubmissions(list)
				})
				.catch(() => {})
		}
		load()
		const interval = setInterval(load, 2000)
		return () => {
			cancelled = true
			clearInterval(interval)
		}
	}, [livePoll])

	useEffect(() => {
		const timer = setInterval(() => setElapsed(p => p + 1), 1000)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		setSlideElapsed(0)
		const timer = setInterval(() => setSlideElapsed(p => p + 1), 1000)
		return () => clearInterval(timer)
	}, [currentSlide])

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
				toast.info('Нет рисунков для отправки')
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
					toast.success('Слайд с рисунками отправлен студентам')
				} catch {
					toast.error('Ошибка при отправке слайда')
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
	const livePollAnswers = livePollSubmissions.flatMap(s => s.answers || [])
	const livePollAnswered = livePollAnswers.length
	const livePollCorrect = livePollAnswers.filter((a: any) => a.correct === true).length
	const livePollDistribution = livePollAnswers.reduce<Record<string, number>>((acc, answer: any) => {
		const key = answer.selectedOptionText || answer.openText || 'Без ответа'
		acc[key] = (acc[key] || 0) + 1
		return acc
	}, {})

	const getStudentDisplayName = (student: StudentDto) => {
		if (student.realName) return student.realName
		const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim()
		return fullName || student.username || `ID: ${student.chatId}`
	}

	const getStudentSecondary = (student: StudentDto) => {
		if (student.groupName) return student.groupName
		if (student.username) return `@${student.username}`
		return `ID: ${student.chatId}`
	}

	const handleSendMessage = () => {
		if (!quickMessage.trim() || !lectureId || isMessageCoolingDown) return
		const msg = quickMessage.trim()
		
		setQuickMessage('')
		setIsMessageCoolingDown(true)
		setTimeout(() => setIsMessageCoolingDown(false), 1000)

		broadcastMessage(lectureId, msg)
			.then(() => toast.success('Сообщение отправлено всем студентам'))
			.catch(() => toast.error('Не удалось отправить сообщение'))
	}

	const handleReplyToStudent = (qId: string) => {
		if (!replyText.trim() || !lectureId || isMessageCoolingDown) return
		const text = replyText.trim()
		const q = questions.find(x => x.id === qId)
		
		setQuestions(prev =>
			prev.map(x =>
				x.id === qId ? { ...x, status: 'ANSWERED', answer: text } : x
			)
		)
		setReplyTo(null)
		setReplyText('')
		
		setIsMessageCoolingDown(true)
		setTimeout(() => setIsMessageCoolingDown(false), 1000)

		sendPrivateReply(lectureId, qId, text)
			.then(() => toast.success(`Ответ отправлен в Telegram: ${q?.student}`))
			.catch(() => toast.error('Не удалось отправить ответ'))
	}

	const handleAnswerBroadcast = (qId: string) => {
		if (!replyText.trim() || !lectureId || isMessageCoolingDown) return
		const text = replyText.trim()
		const q = questions.find(x => x.id === qId)
		
		setQuestions(prev =>
			prev.map(x =>
				x.id === qId ? { ...x, status: 'ANSWERED', answer: text } : x
			)
		)
		setReplyTo(null)
		setReplyText('')

		setIsMessageCoolingDown(true)
		setTimeout(() => setIsMessageCoolingDown(false), 1000)

		sendBroadcastReply(lectureId, qId, text)
			.then(() => toast.success(`Ответ на "${q?.text}" отправлен всем студентам`))
			.catch(() => toast.error('Не удалось отправить ответ'))
	}

	const handleDismissQuestion = async (qId: string) => {
		if (!lectureId) return
		setQuestions(prev =>
			prev.map(x => (x.id === qId ? { ...x, status: 'DISMISSED' } : x))
		)
		setReplyTo(null)
		try {
			await dismissStudentQuestion(lectureId, qId)
			toast.info('Вопрос отправлен в архив')
		} catch {
			setQuestions(prev =>
				prev.map(x => (x.id === qId ? { ...x, status: 'OPEN' } : x))
			)
			toast.error('Не удалось отправить вопрос в архив')
		}
	}

	const handleKickStudent = async () => {
		if (!lectureId || !kickTarget) return
		setKickingChatId(kickTarget.chatId)
		try {
			await kickLectureStudent(lectureId, kickTarget.chatId)
			setStudents(prev => prev.filter(x => x.chatId !== kickTarget.chatId))
			toast.success('Студент отключен')
			setKickTarget(null)
		} catch {
			toast.error('Не удалось отключить студента')
		} finally {
			setKickingChatId(null)
		}
	}

	const handleAssignTestAll = async (examId: string) => {
		if (!lectureId) return
		try {
			if (showTestModal === -1) {
				await broadcastExam(examId, lectureId)
				toast.success(`Тест запущен для студентов (${studentsCount})`)
			} else if (showTestModal !== null) {
				await sendExamToUser(examId, showTestModal)
				toast.success(`Тест выдан студенту`)
			}
		} catch {
			toast.error('Не удалось запустить тест')
		}
		setShowTestModal(null)
	}

	const handleAskLiveQuestion = async (sourceQuestion: LiveExamQuestion) => {
		if (!lectureId) return
		setLaunchingQuestionId(sourceQuestion.id)
		try {
			const title = `Быстрый вопрос: ${sourceQuestion.text.slice(0, 60)}`
			const exam = await createExam({
				lectureId,
				title,
				examType: 'EXAM',
				questions: [
					{
						text: sourceQuestion.text,
						type: sourceQuestion.type,
						timeLimitSec: null,
						options:
							sourceQuestion.type === 'MULTIPLE'
								? (sourceQuestion.options || []).map(option => ({
										text: option.text,
										correct: option.correct
									}))
								: undefined
					}
				]
			})
			await broadcastExam(exam.id, lectureId)
			setLivePoll({
				examId: exam.id,
				title,
				questionText: sourceQuestion.text,
				questionType: sourceQuestion.type,
				correctAnswer: sourceQuestion.options?.find(option => option.correct)?.text
			})
			setLivePollSubmissions([])
			toast.success(`Вопрос отправлен студентам (${studentsCount})`)
		} catch {
			toast.error('Не удалось отправить вопрос')
		} finally {
			setLaunchingQuestionId(null)
		}
	}

	const handleFinishLivePoll = async () => {
		if (!lectureId || !livePoll) return
		try {
			await closeExam(livePoll.examId)
			if (livePoll.correctAnswer) {
				await broadcastMessage(
					lectureId,
					`Быстрый вопрос завершён. Правильный ответ: ${livePoll.correctAnswer}`
				)
			}
			setLivePoll(null)
			setLivePollSubmissions([])
			toast.success('Опрос завершён')
		} catch {
			toast.error('Не удалось завершить опрос')
		}
	}

	const handleSendSatisfaction = async () => {
		if (!lectureId) return
		const questionText = (
			editingSatisfaction ? satisfactionDraft : satisfactionPreset
		).trim()
		if (!questionText) {
			toast.error('Введите текст вопроса')
			return
		}
		try {
			const exam = await createExam({
				lectureId,
				title: 'Опрос об удовлетворённости',
				examType: 'SURVEY',
				questions: [
					{
						text: questionText,
						type: 'MULTIPLE',
						options: [
							{ text: '1 ⭐', correct: false },
							{ text: '2 ⭐⭐', correct: false },
							{ text: '3 ⭐⭐⭐', correct: false },
							{ text: '4 ⭐⭐⭐⭐', correct: false },
							{ text: '5 ⭐⭐⭐⭐⭐', correct: false }
						]
					}
				]
			})
			await broadcastExam(exam.id, lectureId)
			setSatisfactionPreset(questionText)
			setSatisfactionDraft(questionText)
			setEditingSatisfaction(false)
			setShowSatisfactionModal(false)
			toast.success(`Опрос запущен для студентов (${studentsCount})`)
		} catch {
			toast.error('Не удалось запустить опрос')
		}
	}

	const handleSlideChange = async (newSlideIndex: number) => {
		if (!lectureId || isChangingSlide) return

		const newSlide = slidesData[newSlideIndex]
		if (!newSlide) return

		if (newSlide.isQrSlide) {
			setCurrentSlide(newSlideIndex)
			return
		}

		// Оптимистичный update — UI реагирует мгновенно, до ответа сервера
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

			// xAPI: отправляем событие появления слайда для сбора метрик
			sendXapiSlideShown(parseInt(lectureId), newSlide.id as any)

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
			toast.error('Ошибка при переключении слайда')
		} finally {
			setIsChangingSlide(false)
		}
	}

	const openProjection = () => {
		if (window.electronAPI?.openProjector) {
			window.electronAPI.openProjector(lectureId!)
		} else {
			window.open(`/#/projection/${lectureId}`, 'projection', 'width=1280,height=720')
		}
		toast.success('Окно проектора открыто. Переместите на второй экран.')
	}

	const handleExitToMenu = () => {
		if (lectureId) {
			localStorage.setItem('active_lecture_id', lectureId)
			window.dispatchEvent(new StorageEvent('storage', { key: 'active_lecture_id', newValue: lectureId }))
		}
		navigate('/')
	}

	const handleConfirmEndLecture = async () => {
		if (!lectureId) return
		setEndingLecture(true)
		try {
			await stopLecture(parseInt(lectureId, 10))
			localStorage.removeItem('active_lecture_id')
			window.dispatchEvent(new StorageEvent('storage', { key: 'active_lecture_id', newValue: null }))
			setShowConfirmEnd(false)
			toast.success('Лекция завершена, студенты отключены')
			navigate('/')
		} catch (e) {
			console.error(e)
			toast.error('Лекция не найдена на сервере, локальная сессия сброшена')
			localStorage.removeItem('active_lecture_id')
			window.dispatchEvent(new StorageEvent('storage', { key: 'active_lecture_id', newValue: null }))
			setShowConfirmEnd(false)
			navigate('/')
		} finally {
			setEndingLecture(false)
		}
	}

	if (isLoading) {
		return (
			<div className="h-screen bg-black flex items-center justify-center">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
					<span className="text-neutral-400 text-sm">Загрузка лекции...</span>
				</div>
			</div>
		)
	}

	if (!slide) {
		return (
			<div className="h-screen bg-black flex items-center justify-center">
				<div className="text-neutral-400 text-center">
					<p className="text-lg mb-2">Слайды не найдены</p>
					<p className="text-sm">
						Убедитесь, что к лекции привязана презентация
					</p>
					<Link
						to="/"
						className="mt-4 inline-block text-orange-500 hover:text-orange-400"
					>
						← На главную
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
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => setShowConfirmExit(true)}
								className="flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-300 rounded text-xs hover:bg-neutral-700 flex-shrink-0"
							>
								<ArrowLeft className="w-3 h-3" />
								<span className="hidden sm:inline">Меню</span>
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Выйти в меню (лекция продолжается)</p>
						</TooltipContent>
					</Tooltip>
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
											{accessType === 'password' ? 'Пароль' : 'QR'}
										</span>
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>
									{accessType === 'password'
										? 'Показать пароль для подключения'
										: 'Показать QR-код для подключения'}
								</p>
							</TooltipContent>
						</Tooltip>
					)}

					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={openProjection}
								className="flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-300 rounded text-xs hover:bg-neutral-700"
								title="Открывает отдельное окно с чистым слайдом для проектора"
							>
								<Monitor className="w-3 h-3" />{' '}
								<span className="hidden sm:inline">Проектор</span>
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Открыть окно проектора</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => setDrawingActive(!drawingActive)}
								className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${drawingActive ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
								title="Рисование поверх слайда"
							>
								<Pencil className="w-3 h-3" />{' '}
								<span className="hidden sm:inline">
									{drawingActive ? 'Рисование ВКЛ' : 'Рисовать'}
								</span>
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								{drawingActive
									? 'Отключить рисование'
									: 'Включить рисование на слайде'}
							</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								id="slide-notes-toggle-btn"
								onClick={() => setShowNotes(v => !v)}
								className={`snp-trigger-btn ${showNotes ? 'snp-trigger-btn--on' : 'snp-trigger-btn--off'}`}
							>
								<NotebookPen className="w-3 h-3" />{' '}
								<span className="hidden sm:inline">Заметки</span>
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Заметки к слайду</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => setSidebarOpen(!sidebarOpen)}
								className="p-1.5 text-neutral-400 hover:text-white"
							>
								<MessageSquare className="w-4 h-4" />
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								{sidebarOpen
									? 'Скрыть чат с вопросами'
									: 'Показать чат с вопросами'}
							</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => setShowConfirmEnd(true)}
								className="bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 text-sm"
							>
								Завершить
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Завершить лекцию</p>
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
								? 'Пароль для подключения'
								: 'Подключение по QR'}
						</span>
						<button onClick={() => setShowAccessInfo(false)}>
							<X className="w-4 h-4 text-neutral-400" />
						</button>
					</div>
					{accessType === 'password' && (
						<>
								<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center mb-2">
									<div className="text-lg text-orange-700">Пароль задан</div>
									<p className="text-xs text-neutral-500 mt-1">
										Изменить или показать новый пароль можно в настройках лекции.
									</p>
								</div>
							</>
						)}
					{accessType === 'invitation' && (
						<div className="text-center">
							<div className="bg-white border border-neutral-200 rounded-lg p-3 inline-block mb-2">
								<QRCodeSVG
									value={telegramJoinUrl}
									size={160}
									level="M"
									aria-label="QR для подключения"
								/>
							</div>
							<p className="text-xs text-neutral-500">Покажите студентам</p>
						</div>
					)}
				</div>
			)}

			{/* Exit to menu confirmation */}
			{showConfirmExit && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-xl p-6 max-w-sm w-full">
						<h3 className="mb-2">Выйти в меню?</h3>
						<p className="text-sm text-neutral-500 mb-4">
							Лекция продолжится, студенты останутся подключены. Вы сможете вернуться через боковое меню.
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setShowConfirmExit(false)}
								className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleExitToMenu}
								className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
							>
								Выйти в меню
							</button>
						</div>
					</div>
				</div>
			)}

			{/* End confirmation */}
			{showConfirmEnd && (
				<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-xl p-6 max-w-sm w-full">
						<h3 className="mb-2">Завершить лекцию?</h3>
						<p className="text-sm text-neutral-500 mb-4">
							Все студенты будут отключены.
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								disabled={endingLecture}
								onClick={() => setShowConfirmEnd(false)}
								className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm"
							>
								Отмена
							</button>
							<button
								type="button"
								disabled={endingLecture}
								onClick={handleConfirmEndLecture}
								className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-center text-sm hover:bg-red-700 disabled:opacity-60"
							>
								{endingLecture ? 'Завершение…' : 'Завершить'}
							</button>
						</div>
					</div>
				</div>
			)}

			<AlertDialog
				open={kickTarget !== null}
				onOpenChange={open => {
					if (!open && kickingChatId === null) setKickTarget(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Отключить студента?</AlertDialogTitle>
						<AlertDialogDescription>
							{kickTarget
								? `${getStudentDisplayName(kickTarget)} больше не сможет подключиться к этой лекции.`
								: 'Студент больше не сможет подключиться к этой лекции.'}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={kickingChatId !== null}>
							Отмена
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={e => {
								e.preventDefault()
								handleKickStudent()
							}}
							disabled={kickingChatId !== null}
							className="bg-red-600 text-white hover:bg-red-700"
						>
							{kickingChatId !== null ? 'Отключение…' : 'Отключить'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className="flex-1 flex overflow-hidden">
				{/* Main area */}
				<div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-w-0">
					<div className="w-full max-w-5xl">
						{/* Slide */}
						<div className="relative">
							{/* Notes panel — anchored to slide container */}
							{showNotes && lectureId && slide && (
								<SlideNotesPanel
									lectureId={lectureId}
									slideId={slide.id}
									slideIndex={slide.isQrSlide ? 0 : slide.index}
									onClose={() => setShowNotes(false)}
								/>
							)}
							<div className="relative aspect-video bg-neutral-900 rounded-lg shadow-2xl overflow-hidden flex items-center justify-center">
								{slide.isQrSlide ? (
									<div className="flex flex-col items-center justify-center gap-4 text-white p-8">
										<div className="bg-white rounded-2xl p-4">
											<QRCodeSVG
												value={telegramJoinUrl}
												size={192}
												level="M"
												aria-label="QR для подключения"
											/>
										</div>
										<p className="text-lg font-medium">
											Отсканируйте для подключения
										</p>
										<p className="text-sm text-neutral-400">
											или напишите боту:{' '}
											<span className="font-mono text-orange-400">
												/join {lectureId}
											</span>
										</p>
									</div>
								) : (
									<img
										src={slide.imageUrl}
										alt={`Слайд ${slide.index}`}
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
						{comprehension && (
							<div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white">
								<div className="flex items-center justify-between mb-3">
									<div className="text-sm font-medium">Понимание аудитории</div>
									<div className="text-xs text-neutral-400">{comprehension.totalResponses} ответов</div>
								</div>
								{[
									{ label: '🟢 Понял', bucket: comprehension.green, color: 'bg-green-500' },
									{ label: '🟡 Не до конца', bucket: comprehension.yellow, color: 'bg-yellow-400' },
									{ label: '🔴 Потерялся', bucket: comprehension.red, color: 'bg-red-500' }
								].map(item => (
									<div key={item.label} className="flex items-center gap-3 mb-2 last:mb-0">
										<span className="w-28 text-sm text-neutral-300">{item.label}</span>
										<div className="flex-1 bg-neutral-800 rounded-full h-2">
											<div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.bucket.pct}%` }} />
										</div>
										<span className="w-10 text-sm text-neutral-300 text-right">{item.bucket.pct}%</span>
									</div>
								))}
							</div>
						)}

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
									<p>Предыдущий слайд</p>
								</TooltipContent>
							</Tooltip>
							<div className="flex items-center gap-2">
								<span className="text-white text-sm bg-neutral-800 px-3 py-1.5 rounded-lg">
									{slide?.isQrSlide ? 'QR' : slide?.index} / {slidesData.filter(s => !s.isQrSlide).length}
								</span>
								<span className="text-neutral-300 text-sm bg-neutral-800 px-3 py-1.5 rounded-lg">
									На слайде {formatTime(slideElapsed)}
								</span>
							</div>
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
									<p>Следующий слайд</p>
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
											alt={`Слайд ${s.index}`}
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
					<div
						className="fixed inset-0 bg-black/60 z-40 lg:hidden"
						onClick={() => setSidebarOpen(false)}
					/>
				)}
				{sidebarOpen && (
					<div className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw-2rem,380px)] bg-neutral-900 border-l border-neutral-800 flex-col flex-shrink-0 shadow-2xl lg:static lg:z-auto lg:w-[340px] lg:shadow-none xl:w-[380px]">
						<div className="lg:hidden flex items-center justify-between px-3 py-3 border-b border-neutral-800">
							<span className="text-sm text-white">Аудитория</span>
							<button
								onClick={() => setSidebarOpen(false)}
								className="p-1.5 text-neutral-400 hover:text-white"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						<div className="flex border-b border-neutral-800">
							{(['questions', 'polls', 'students'] as const).map(tab => (
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
										? `Вопросы (${activeQuestions.length})`
										: tab === 'polls'
											? 'Опросы'
											: `Студенты (${studentsCount})`}
									{activeTab === tab && (
										<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
									)}
								</button>
							))}
						</div>

						<div className="flex-1 overflow-y-auto p-3">
							{activeTab === 'questions' ? (
								<>
									<div className="flex rounded-lg bg-neutral-800 p-1 mb-3">
										{(['active', 'archive'] as const).map(view => (
											<button
												key={view}
												onClick={() => setQuestionView(view)}
												className={`flex-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
													questionView === view
														? 'bg-neutral-700 text-white'
														: 'text-neutral-400 hover:text-white'
												}`}
											>
												{view === 'active'
													? `Активные (${activeQuestions.length})`
													: `Архив (${archivedQuestions.length})`}
											</button>
										))}
									</div>

									{visibleQuestions.length === 0 ? (
										<div className="text-neutral-500 text-sm text-center py-8">
											{questionView === 'active'
												? 'Нет активных вопросов'
												: 'Архив пуст'}
										</div>
									) : (
										<div className="space-y-2">
											{visibleQuestions.map(q => (
											<div
												key={q.id}
												className={`rounded-lg p-3 ${
													isActiveQuestion(q)
														? 'bg-neutral-800'
														: 'bg-neutral-900 border border-neutral-800'
												}`}
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
																	Новый
																</span>
															)}
														</div>
														<div className="text-neutral-400 text-xs">
															{q.time}
															{q.upvotes > 0 && (
																<span className="ml-2 text-orange-400">+{q.upvotes}</span>
															)}
														</div>
													</div>
												</div>
												<p className="text-neutral-300 text-sm mb-2">
													{q.text}
												</p>
												{!isActiveQuestion(q) && (
													<div className="text-xs text-neutral-500 mb-2">
														{q.status === 'ANSWERED'
															? `Отвечено${q.answer ? `: ${q.answer}` : ''}`
															: 'В архиве без ответа'}
													</div>
												)}

												{!isActiveQuestion(q) ? null : replyTo === q.id ? (
													<div className="space-y-2">
														<textarea
															value={replyText}
															onChange={e => setReplyText(e.target.value)}
															onKeyDown={e => {
																if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
																	handleReplyToStudent(q.id)
																}
															}}
															placeholder="Введите ответ..."
															className="w-full px-3 py-2 bg-neutral-700 text-white border border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
															rows={2}
														/>
														<div className="flex gap-1">
															<button
																onClick={() => handleReplyToStudent(q.id)}
																disabled={isMessageCoolingDown}
																className="flex-1 px-2 py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50"
															>
																Лично
															</button>
															<button
																onClick={() => handleAnswerBroadcast(q.id)}
																disabled={isMessageCoolingDown}
																className="flex-1 px-2 py-1.5 bg-neutral-600 text-white text-xs rounded hover:bg-neutral-500 disabled:opacity-50"
															>
																Всем
															</button>
															<button
																onClick={() => {
																	setReplyTo(null)
																	setReplyText('')
																}}
																className="px-2 py-1.5 text-neutral-400 text-xs hover:text-white"
															>
																✕
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
															Ответить
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
									)}
								</>
							) : activeTab === 'polls' ? (
								<div className="space-y-4">
									{livePoll && (
											<div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
												<div className="text-xs text-orange-300 mb-1">Идёт быстрый вопрос</div>
												<div className="text-sm text-white mb-3">{livePoll.questionText}</div>
											<div className="grid grid-cols-3 gap-2 text-center mb-3">
												<div className="rounded bg-neutral-900 p-2">
													<div className="text-lg text-white">{livePollAnswered}</div>
													<div className="text-[11px] text-neutral-500">ответили</div>
												</div>
												<div className="rounded bg-neutral-900 p-2">
													<div className="text-lg text-white">{studentsCount}</div>
													<div className="text-[11px] text-neutral-500">студентов</div>
												</div>
												<div className="rounded bg-neutral-900 p-2">
													<div className="text-lg text-white">
														{livePoll.questionType === 'MULTIPLE' ? livePollCorrect : '—'}
													</div>
													<div className="text-[11px] text-neutral-500">верно</div>
												</div>
											</div>
											{Object.keys(livePollDistribution).length > 0 && (
												<div className="space-y-1.5">
													{Object.entries(livePollDistribution).map(([answer, count]) => (
														<div key={answer}>
															<div className="flex justify-between text-xs text-neutral-300 mb-1">
																<span className="truncate pr-2">{answer}</span>
																<span>{count}</span>
															</div>
															<div className="h-1.5 rounded bg-neutral-800 overflow-hidden">
																<div
																	className="h-full bg-orange-500"
																	style={{
																		width: `${livePollAnswered ? Math.round((count / livePollAnswered) * 100) : 0}%`
																	}}
																/>
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									)}

									<div>
										<div className="text-sm text-white mb-2">Банк вопросов</div>
										{bankExams.length === 0 ? (
											<div className="text-neutral-500 text-sm py-6 text-center">
												Нет тестов с вопросами
											</div>
										) : (
											<div className="space-y-3">
												<select
													value={selectedBankExamId}
													onChange={e => setSelectedBankExamId(e.target.value)}
													className="w-full px-3 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
												>
													{bankExams.map(exam => (
														<option
															key={exam.id}
															value={exam.id}
														>
															{exam.title}
														</option>
													))}
												</select>

												{loadingBankQuestions ? (
													<div className="text-neutral-500 text-sm py-4 text-center">
														Загрузка вопросов...
													</div>
												) : (
													<div className="space-y-2">
														{bankQuestions.map(question => (
															<div
																key={question.id}
																className="rounded-lg bg-neutral-800 p-3"
															>
																<div className="text-sm text-neutral-200 mb-2">
																	{question.text}
																</div>
																<button
																	onClick={() => handleAskLiveQuestion(question)}
																	disabled={launchingQuestionId === question.id}
																	className="w-full px-3 py-1.5 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 disabled:opacity-50"
																>
																	{launchingQuestionId === question.id
																		? 'Отправляем...'
																		: 'Спросить сейчас'}
																</button>
															</div>
														))}
													</div>
												)}
												<button
													onClick={handleFinishLivePoll}
													className="mt-3 w-full px-3 py-1.5 bg-neutral-800 text-white text-sm rounded hover:bg-neutral-700"
												>
													Завершить опрос
												</button>
											</div>
										)}
									</div>
								</div>
							) : (
								<div className="flex flex-col h-full">
									{students.length === 0 ? (
										<div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4 py-8">
											<Users className="w-10 h-10 text-neutral-600" />
											<div className="text-neutral-500 text-sm">
												Пока никто не подключился
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
																{getStudentDisplayName(s)[0] || 'С'}
															</div>
															<div className="min-w-0">
																<div className="text-white text-sm font-medium truncate">
																	{getStudentDisplayName(s)}
																</div>
																<div className="text-orange-400/80 text-xs truncate">
																	{getStudentSecondary(s)}
																	</div>
																</div>
															</div>
															<button
																onClick={() => setKickTarget(s)}
																className="p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors"
																title="Выгнать из лекции"
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
															Выдать тест лично
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
											<ClipboardList className="w-4 h-4" /> Запустить квиз
										</button>
										<button
											onClick={() => setShowSatisfactionModal(true)}
											className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 text-sm"
										>
											<Star className="w-4 h-4" /> Узнать мнение
										</button>
									</div>
								</div>
							)}
						</div>

						{/* Quick message */}
						<div className="p-3 border-t border-neutral-800">
							<div className="text-neutral-400 text-xs mb-1.5">
								Сообщение всем студентам
							</div>
							<div className="flex gap-2">
								<input
									type="text"
									value={quickMessage}
									onChange={e => setQuickMessage(e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
											handleSendMessage()
										} else if (e.key === 'Enter') {
											handleSendMessage()
										}
									}}
									placeholder="Написать..."
									className="flex-1 px-3 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
								/>
								<button
									onClick={handleSendMessage}
									disabled={isMessageCoolingDown}
									className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 disabled:opacity-50"
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
								? 'Запустить квиз для всех'
								: 'Выдать тест студенту'}
						</h3>
						<p className="text-sm text-neutral-500 mb-4">
							{showTestModal === -1
								? 'Введите название квиза — все студенты получат его через Telegram-бот.'
								: 'Выберите тест. Он будет отправлен только этому студенту.'}
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
							Отмена
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
							<h3 className="mb-0">Узнать мнение</h3>
						</div>
						<p className="text-sm text-neutral-500 mb-4">
							Студенты получат вопрос и оценят лекцию по шкале 1–5. На основе
							оценок рассчитывается процент удовлетворённости.
						</p>

						<div className="mb-4">
							<div className="flex items-center justify-between mb-1.5">
								<label className="text-sm">Текст вопроса</label>
								{!editingSatisfaction && (
									<button
										onClick={() => {
											setEditingSatisfaction(true)
											setSatisfactionDraft(satisfactionPreset)
										}}
										className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600"
									>
										<Pencil className="w-3 h-3" /> Редактировать
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
												toast.success('Пресет обновлён')
											}}
											className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
										>
											Сохранить
										</button>
										<button
											onClick={() => setEditingSatisfaction(false)}
											className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
										>
											Отмена
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
								Студенты выберут оценку от 1 до 5
							</p>
						</div>

						<div className="flex gap-2">
							<button
								onClick={() => {
									setShowSatisfactionModal(false)
									setEditingSatisfaction(false)
									setSatisfactionDraft(satisfactionPreset)
								}}
								className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm"
							>
								Отмена
							</button>
							<button
								onClick={handleSendSatisfaction}
								className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
							>
								{`Отправить (${studentsCount})`}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
