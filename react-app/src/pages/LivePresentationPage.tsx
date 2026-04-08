import {
	ChevronLeft,
	ChevronRight,
	ClipboardList,
	Clock,
	Copy,
	Edit2,
	Lock,
	MessageSquare,
	Monitor,
	Pencil,
	QrCode,
	Send,
	Star,
	Users,
	UserX,
	X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { DrawingOverlay } from '../features/DrawingOverlay'

const slidesData = [
	{
		id: 1,
		title: 'Введение в алгоритмы',
		color: 'from-neutral-800 to-neutral-900',
		content: null,
		comment: ''
	},
	{
		id: 2,
		title: 'Что такое алгоритмы?',
		color: 'from-blue-900 to-blue-950',
		content: [
			'Сортировка и поиск',
			'Теория графов',
			'Динамическое программирование',
			'Анализ сложности'
		],
		comment: 'Объяснить на примере сортировки массива'
	},
	{
		id: 3,
		title: 'Нотация большого О',
		color: 'from-blue-900 to-blue-950',
		content: [
			'O(1) — константа',
			'O(log n) — логарифмическая',
			'O(n) — линейная',
			'O(n²) — квадратичная'
		],
		comment: ''
	},
	{
		id: 4,
		title: 'Алгоритмы сортировки',
		color: 'from-purple-800 to-purple-900',
		content: ['Bubble Sort', 'Quick Sort', 'Merge Sort'],
		comment: 'Показать анимацию bubble sort'
	},
	{
		id: 5,
		title: 'Основы теории графов',
		color: 'from-green-800 to-green-900',
		content: ['BFS — поиск в ширину', 'DFS — поиск в глубину'],
		comment: ''
	}
]

const availableTests = [
	{ id: 1, title: 'Тест: Основы алгоритмов', questions: 3 },
	{ id: 2, title: 'Опрос: Качество лекции', questions: 2 }
]

interface Student {
	id: number
	name: string
	initials: string
	connected: boolean
}
interface Question {
	id: number
	student: string
	initials: string
	time: string
	text: string
	isNew: boolean
}

export function LivePresentationPage() {
	const [currentSlide, setCurrentSlide] = useState(0)
	const [quickMessage, setQuickMessage] = useState('')
	const [activeTab, setActiveTab] = useState<'questions' | 'students'>(
		'questions'
	)
	const [sidebarOpen, setSidebarOpen] = useState(true)
	const [elapsed, setElapsed] = useState(0)
	const [showConfirmEnd, setShowConfirmEnd] = useState(false)
	const [replyTo, setReplyTo] = useState<number | null>(null)
	const [replyText, setReplyText] = useState('')
	const [showTestModal, setShowTestModal] = useState<number | null>(null) // studentId or -1 for all
	const [showAccessInfo, setShowAccessInfo] = useState(false)
	const [showSatisfactionModal, setShowSatisfactionModal] = useState(false)
	const [satisfactionPreset, setSatisfactionPreset] = useState(
		'Оцените лекцию от 1 до 5. Насколько понятно и полезно было сегодняшнее занятие?'
	)
	const [editingSatisfaction, setEditingSatisfaction] = useState(false)
	const [satisfactionDraft, setSatisfactionDraft] = useState(satisfactionPreset)
	const [drawingActive, setDrawingActive] = useState(false)

	const [accessType, setAccessType] = useState<
		'open' | 'password' | 'invitation'
	>('password')
	const password = 'algo2026'
	const lectureUrl = 'https://lectureapp.ru/join/abc123'
	const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(lectureUrl)}`

	const [questions, setQuestions] = useState<Question[]>([
		{
			id: 1,
			student: 'Алексей Петров',
			initials: 'АП',
			time: '2 мин.',
			text: 'Можете объяснить разницу в быстрой сортировке?',
			isNew: true
		},
		{
			id: 2,
			student: 'Мария Смирнова',
			initials: 'МС',
			time: '8 мин.',
			text: 'Какова сложность бинарного поиска?',
			isNew: false
		},
		{
			id: 3,
			student: 'Дмитрий Волков',
			initials: 'ДВ',
			time: '12 мин.',
			text: 'В чём разница между BFS и DFS?',
			isNew: true
		}
	])

	const [students, setStudents] = useState<Student[]>([
		{ id: 1, name: 'Алексей Петров', initials: 'АП', connected: true },
		{ id: 2, name: 'Мария Смирнова', initials: 'МС', connected: true },
		{ id: 3, name: 'Иван Козлов', initials: 'ИК', connected: true },
		{ id: 4, name: 'Ольга Новикова', initials: 'ОН', connected: true },
		{ id: 5, name: 'Дмитрий Волков', initials: 'ДВ', connected: true },
		{ id: 6, name: 'Екатерина Лебедева', initials: 'ЕЛ', connected: true },
		{ id: 7, name: 'Андрей Соколов', initials: 'АС', connected: true },
		{ id: 8, name: 'Наталья Морозова', initials: 'НМ', connected: true },
		{ id: 9, name: 'Сергей Новиков', initials: 'СН', connected: true },
		{ id: 10, name: 'Анна Кузнецова', initials: 'АК', connected: true },
		{ id: 11, name: 'Павел Иванов', initials: 'ПИ', connected: true },
		{ id: 12, name: 'Татьяна Попова', initials: 'ТП', connected: false }
	])

	useEffect(() => {
		const timer = setInterval(() => setElapsed(p => p + 1), 1000)
		return () => clearInterval(timer)
	}, [])

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
				setCurrentSlide(p => Math.min(p + 1, slidesData.length - 1))
			}
			if (e.key === 'ArrowLeft') setCurrentSlide(p => Math.max(p - 1, 0))
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [])

	const formatTime = (s: number) =>
		`${Math.floor(s / 60)
			.toString()
			.padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
	const connectedStudents = students.filter(s => s.connected)
	const slide = slidesData[currentSlide]

	const handleSendMessage = () => {
		if (!quickMessage.trim()) return
		toast.success('Сообщение отправлено всем студентам')
		setQuickMessage('')
	}

	const handleReplyToStudent = (qId: number) => {
		if (!replyText.trim()) return
		const q = questions.find(x => x.id === qId)
		toast.success(`Ответ отправлен лично: ${q?.student}`)
		setQuestions(questions.filter(x => x.id !== qId))
		setReplyTo(null)
		setReplyText('')
	}

	const handleAnswerBroadcast = (qId: number) => {
		if (!replyText.trim()) return
		const q = questions.find(x => x.id === qId)
		toast.success(`Ответ на "${q?.text}" отправлен всем`)
		setQuestions(questions.filter(x => x.id !== qId))
		setReplyTo(null)
		setReplyText('')
	}

	const handleDismissQuestion = (qId: number) => {
		setQuestions(questions.filter(x => x.id !== qId))
		setReplyTo(null)
		toast.info('Вопрос отклонён')
	}

	const handleDisconnectStudent = (id: number) => {
		setStudents(
			students.map(s => (s.id === id ? { ...s, connected: false } : s))
		)
		toast.success(`${students.find(s => s.id === id)?.name} отключён`)
	}

	const handleAssignTest = (studentId: number, testId: number) => {
		const st = students.find(s => s.id === studentId)
		const t = availableTests.find(x => x.id === testId)
		toast.success(`Тест "${t?.title}" выдан ${st?.name}`)
		setShowTestModal(null)
	}

	const handleAssignTestAll = (testId: number) => {
		const t = availableTests.find(x => x.id === testId)
		toast.success(
			`Тест "${t?.title}" выдан всем студентам (${connectedStudents.length})`
		)
		setShowTestModal(null)
	}

	const handleSendSatisfaction = () => {
		toast.success(
			`Опрос удовлетворённости отправлен ${connectedStudents.length} студентам`
		)
		setShowSatisfactionModal(false)
	}

	const openProjection = () => {
		window.open(`/projection/1`, 'projection', 'width=1280,height=720')
		toast.success(
			'Окно проектора открыто. Выведите его на второй экран — там отображается только слайд, без интерфейса преподавателя.'
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
					<span className="text-white text-sm truncate">{slide.title}</span>
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
						{connectedStudents.length}
					</span>

					{(accessType === 'password' || accessType === 'invitation') && (
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
					)}

					<button
						onClick={openProjection}
						className="flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-300 rounded text-xs hover:bg-neutral-700"
						title="Открывает отдельное окно с чистым слайдом для проектора"
					>
						<Monitor className="w-3 h-3" />{' '}
						<span className="hidden sm:inline">Проектор</span>
					</button>
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
					<button
						onClick={() => setSidebarOpen(!sidebarOpen)}
						className="p-1.5 text-neutral-400 hover:text-white hidden lg:block"
					>
						<MessageSquare className="w-4 h-4" />
					</button>
					<button
						onClick={() => setShowConfirmEnd(true)}
						className="bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 text-sm"
					>
						Завершить
					</button>
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
								<div className="text-2xl tracking-wider text-orange-700">
									{password}
								</div>
							</div>
							<button
								onClick={() => {
									navigator.clipboard.writeText(password)
									toast.success('Скопировано')
								}}
								className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 mx-auto"
							>
								<Copy className="w-3.5 h-3.5" /> Копировать
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
							<p className="text-xs text-neutral-500">Покажите студентам</p>
						</div>
					)}
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
								onClick={() => setShowConfirmEnd(false)}
								className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm"
							>
								Отмена
							</button>
							<Link
								to="/"
								className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-center text-sm hover:bg-red-700"
							>
								Завершить
							</Link>
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
							<div
								className={`aspect-video bg-gradient-to-br ${slide.color} rounded-lg shadow-2xl p-8 sm:p-12 lg:p-16 flex flex-col justify-center`}
							>
								<h1 className="text-white text-2xl sm:text-3xl lg:text-5xl mb-4">
									{slide.title}
								</h1>
								<p className="text-white/60 text-sm sm:text-base mb-4">
									Препод. Иван Петров — Весна 2026
								</p>
								{slide.content && (
									<ul className="space-y-2 mt-2">
										{slide.content.map((item, i) => (
											<li
												key={i}
												className="text-white/90 text-sm sm:text-lg"
											>
												• {item}
											</li>
										))}
									</ul>
								)}
							</div>
							<DrawingOverlay
								slideIndex={currentSlide}
								active={drawingActive}
								onToggle={() => setDrawingActive(!drawingActive)}
							/>
						</div>

						{/* Comment for presenter only */}
						{slide.comment && (
							<div className="mt-3 bg-orange-500/20 border border-orange-500/40 rounded-lg px-4 py-3 flex items-start gap-2">
								<MessageSquare className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
								<div>
									<div className="text-orange-300 text-xs mb-0.5">
										Ваш комментарий (только для вас, не виден на проекторе)
									</div>
									<div className="text-orange-100 text-sm">{slide.comment}</div>
								</div>
							</div>
						)}

						{/* Nav */}
						<div className="flex items-center justify-between mt-4">
							<button
								onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
								disabled={currentSlide === 0}
								className="p-2 sm:px-4 sm:py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-30"
							>
								<ChevronLeft className="w-5 h-5" />
							</button>
							<span className="text-white text-sm bg-neutral-800 px-3 py-1.5 rounded-lg">
								{currentSlide + 1} / {slidesData.length}
							</span>
							<button
								onClick={() =>
									setCurrentSlide(
										Math.min(slidesData.length - 1, currentSlide + 1)
									)
								}
								disabled={currentSlide === slidesData.length - 1}
								className="p-2 sm:px-4 sm:py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-30"
							>
								<ChevronRight className="w-5 h-5" />
							</button>
						</div>

						{/* Thumbnails */}
						<div className="flex gap-2 mt-4 overflow-x-auto pb-2">
							{slidesData.map((s, i) => (
								<button
									key={s.id}
									onClick={() => setCurrentSlide(i)}
									className={`flex-shrink-0 w-20 aspect-video bg-gradient-to-br ${s.color} rounded border-2 transition-all relative ${
										i === currentSlide
											? 'border-orange-500 scale-105'
											: 'border-neutral-700 opacity-50 hover:opacity-80'
									}`}
								>
									<div className="text-white text-[8px] p-1.5 truncate">
										{s.title}
									</div>
									{s.comment && (
										<div className="absolute top-0.5 right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
									)}
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
										? `Вопросы (${questions.length})`
										: `Студенты (${connectedStudents.length})`}
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
										Нет вопросов
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
																	Новый
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
															placeholder="Введите ответ..."
															className="w-full px-3 py-2 bg-neutral-700 text-white border border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
															rows={2}
														/>
														<div className="flex gap-1">
															<button
																onClick={() => handleReplyToStudent(q.id)}
																className="flex-1 px-2 py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
															>
																Лично
															</button>
															<button
																onClick={() => handleAnswerBroadcast(q.id)}
																className="flex-1 px-2 py-1.5 bg-neutral-600 text-white text-xs rounded hover:bg-neutral-500"
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
								)
							) : (
								<div className="flex flex-col h-full">
									<div className="flex-1 overflow-y-auto space-y-1 max-h-[calc(100vh-320px)]">
										{students.map(s => (
											<div
												key={s.id}
												className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${s.connected ? 'hover:bg-neutral-800' : 'opacity-40'}`}
											>
												<div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs text-white flex-shrink-0">
													{s.initials}
												</div>
												<span className="text-white text-sm flex-1 truncate">
													{s.name}
												</span>
												<span
													className={`w-2 h-2 rounded-full flex-shrink-0 ${s.connected ? 'bg-green-500' : 'bg-neutral-600'}`}
												/>
												{s.connected && (
													<div className="flex gap-1">
														<button
															onClick={() => setShowTestModal(s.id)}
															title="Выдать тест"
															className="p-1 text-neutral-500 hover:text-orange-400"
														>
															<ClipboardList className="w-3.5 h-3.5" />
														</button>
														<button
															onClick={() => handleDisconnectStudent(s.id)}
															title="Отключить"
															className="p-1 text-neutral-500 hover:text-red-400"
														>
															<UserX className="w-3.5 h-3.5" />
														</button>
													</div>
												)}
											</div>
										))}
									</div>

									{/* Action buttons */}
									<div className="mt-3 pt-3 border-t border-neutral-800 space-y-2">
										<button
											onClick={() => setShowTestModal(-1)}
											className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
										>
											<ClipboardList className="w-4 h-4" /> Опросить всех
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
									onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
									placeholder="Написать..."
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
						<h3 className="mb-1">Выдать тест</h3>
						<p className="text-sm text-neutral-500 mb-4">
							{showTestModal === -1
								? `Выберите тест для всех студентов (${connectedStudents.length})`
								: `Выберите тест для ${students.find(s => s.id === showTestModal)?.name}`}
						</p>
						{availableTests.length === 0 ? (
							<p className="text-sm text-neutral-500 text-center py-4">
								Нет доступных тестов. Создайте тест в разделе «Тесты».
							</p>
						) : (
							<div className="space-y-2 mb-4 overflow-y-auto max-h-60">
								{availableTests.map(t => (
									<button
										key={t.id}
										onClick={() =>
											showTestModal === -1
												? handleAssignTestAll(t.id)
												: handleAssignTest(showTestModal, t.id)
										}
										className="w-full text-left p-3 border border-neutral-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
									>
										<div className="text-sm">{t.title}</div>
										<div className="text-xs text-neutral-500">
											{t.questions} вопросов
										</div>
									</button>
								))}
							</div>
						)}
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
										<Edit2 className="w-3 h-3" /> Редактировать
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
								onClick={() => setShowSatisfactionModal(false)}
								className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm"
							>
								Отмена
							</button>
							<button
								onClick={handleSendSatisfaction}
								className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
							>
								Отправить ({connectedStudents.length})
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
