import {
	BarChart3,
	Check,
	ChevronDown,
	ChevronRight,
	Clock,
	Copy,
	Download,
	Pencil,
	Plus,
	Send,
	Trash2,
	Upload
} from 'lucide-react'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { LectureListItem, listLectures } from '../app/api/client'
import {
	broadcastExam,
	closeExam,
	createExam,
	deleteExam,
	duplicateExam,
	exportGift,
	getExam,
	getExamsByLecture,
	getExamSubmissions,
	gradeAnswer,
	importGift,
	launchExam,
	updateExam
} from '../app/api/quiz.api'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shared/tooltip'

interface ApiOption {
	id: string
	text: string
	correct?: boolean
}
interface ApiQuestion {
	id: string
	orderIndex: number
	text: string
	type: 'MULTIPLE' | 'OPEN'
	timeLimitSec: number | null
	options: ApiOption[]
}
interface ApiExam {
	id: string
	lectureId: string
	title: string
	totalTimeSec: number | null
	status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
	examType?: 'EXAM' | 'SURVEY'
	questionCount?: number
	questions: ApiQuestion[]
}
interface ApiAnswer {
	answerId: string
	questionId: string
	questionText: string
	questionType: 'MULTIPLE' | 'OPEN'
	selectedOptionId: string | null
	selectedOptionText: string | null
	openText: string | null
	score: number | null
	maxScore: number
	correct: boolean | null
}
interface ApiSubmission {
	submissionId: string
	chatId: number
	startedAt: string
	completedAt: string | null
	totalScore: number
	maxScore: number
	hasUngraded: boolean
	answers: ApiAnswer[]
}

interface DraftAnswer {
	id: number
	text: string
	correct: boolean
}
interface DraftQuestion {
	id: number
	text: string
	type: 'multiple' | 'open'
	time: string
	answers: DraftAnswer[]
}

function getStatusLabel(status: string) {
	if (status === 'ACTIVE')
		return { text: 'Запущен', cls: 'bg-green-100 text-green-700' }
	if (status === 'CLOSED')
		return { text: 'Закрыт', cls: 'bg-neutral-100 text-neutral-500' }
	return { text: 'Черновик', cls: 'bg-blue-100 text-blue-700' }
}

export function TestsPage() {
	const [lectures, setLectures] = useState<LectureListItem[]>([])
	const [selectedLectureId, setSelectedLectureId] = useState<number>(0)

	const [exams, setExams] = useState<ApiExam[]>([])
	const [loadingExams, setLoadingExams] = useState(false)
	const [expandedExam, setExpandedExam] = useState<string | null>(null)

	const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
	const [examDetail, setExamDetail] = useState<ApiExam | null>(null)
	const [submissions, setSubmissions] = useState<ApiSubmission[]>([])
	const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
	const [view, setView] = useState<
		'list' | 'create' | 'stats' | 'student-detail'
	>('list')

	// Create form state
	const [newTitle, setNewTitle] = useState('')
	const [newTotalTime, setNewTotalTime] = useState('')
	const [questionType, setQuestionType] = useState<'multiple' | 'open'>(
		'multiple'
	)
	const [questionText, setQuestionText] = useState('')
	const [timeLimit, setTimeLimit] = useState('60')
	const [answers, setAnswers] = useState<DraftAnswer[]>([
		{ id: 1, text: '', correct: false },
		{ id: 2, text: '', correct: false }
	])
	const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([])
	const [saving, setSaving] = useState(false)
	const [importing, setImporting] = useState(false)
	const [editingExamId, setEditingExamId] = useState<string | null>(null)
	const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
		null
	)
	const giftInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		listLectures()
			.then(setLectures)
			.catch(() => toast.error('Не удалось загрузить лекции'))
	}, [])

	useEffect(() => {
		if (!selectedLectureId) {
			setExams([])
			return
		}
		setLoadingExams(true)
		getExamsByLecture(String(selectedLectureId))
			.then((list: any[]) =>
				setExams(
					list
						.filter((e: any) => e.examType !== 'SURVEY')
						.map(e => ({ ...e, questions: [] }))
				)
			)
			.catch(() => toast.error('Не удалось загрузить тесты'))
			.finally(() => setLoadingExams(false))
	}, [selectedLectureId])

	const reloadExams = () => {
		if (!selectedLectureId) return
		getExamsByLecture(String(selectedLectureId))
			.then((list: any[]) =>
				setExams(
					list
						.filter((e: any) => e.examType !== 'SURVEY')
						.map(e => ({ ...e, questions: [] }))
				)
			)
			.catch(() => {})
	}

	const loadExamDetail = async (examId: string) => {
		const detail = (await getExam(examId)) as ApiExam
		setExamDetail(detail)
		return detail
	}

	const startCreate = () => {
		setEditingExamId(null)
		setEditingQuestionId(null)
		setNewTitle('')
		setNewTotalTime('')
		setDraftQuestions([])
		setQuestionText('')
		setTimeLimit('60')
		setAnswers([
			{ id: 1, text: '', correct: false },
			{ id: 2, text: '', correct: false }
		])
		setView('create')
	}

	const startEdit = async (examId: string) => {
		try {
			const detail = (await getExam(examId)) as ApiExam
			setEditingExamId(examId)
			setNewTitle(detail.title)
			setNewTotalTime(
				detail.totalTimeSec ? String(Math.round(detail.totalTimeSec / 60)) : ''
			)
			setDraftQuestions(
				detail.questions.map((q, qi) => ({
					id: Date.now() + qi,
					text: q.text,
					type: q.type === 'MULTIPLE' ? 'multiple' : 'open',
					time: q.timeLimitSec ? String(q.timeLimitSec) : '',
					answers:
						q.type === 'MULTIPLE'
							? q.options.map((o, i) => ({
									id: i + 1,
									text: o.text,
									correct: o.correct ?? false
								}))
							: []
				}))
			)
			setQuestionText('')
			setTimeLimit('60')
			setAnswers([
				{ id: 1, text: '', correct: false },
				{ id: 2, text: '', correct: false }
			])
			setEditingQuestionId(null)
			setView('create')
		} catch {
			toast.error('Не удалось загрузить тест')
		}
	}

	const handleDelete = async (examId: string) => {
		if (!confirm('Удалить тест? Это действие необратимо.')) return
		try {
			await deleteExam(examId)
			toast.success('Тест удалён')
			setExpandedExam(null)
			reloadExams()
		} catch {
			toast.error('Не удалось удалить тест')
		}
	}

	const addQuestion = () => {
		if (!questionText.trim()) {
			toast.error('Введите текст вопроса')
			return
		}
		if (questionType === 'multiple' && !answers.some(a => a.correct)) {
			toast.error('Отметьте правильный ответ')
			return
		}
		if (questionType === 'multiple' && answers.some(a => !a.text.trim())) {
			toast.error('Заполните все варианты')
			return
		}

		const updatedQuestion = {
			id: editingQuestionId || Date.now(),
			text: questionText,
			type: questionType,
			time: timeLimit,
			answers: questionType === 'multiple' ? [...answers] : []
		}

		if (editingQuestionId) {
			setDraftQuestions(
				draftQuestions.map(q =>
					q.id === editingQuestionId ? updatedQuestion : q
				)
			)
			toast.success('Вопрос обновлен')
		} else {
			setDraftQuestions([
				...draftQuestions,
				updatedQuestion as unknown as DraftQuestion
			])
			toast.success('Вопрос добавлен')
		}

		setEditingQuestionId(null)
		setQuestionText('')
		setAnswers([
			{ id: Date.now() + 1, text: '', correct: false },
			{ id: Date.now() + 2, text: '', correct: false }
		])
	}

	const editDraftQuestion = (q: DraftQuestion) => {
		setEditingQuestionId(q.id)
		setQuestionType(q.type)
		setQuestionText(q.text)
		setTimeLimit(q.time)
		setAnswers(
			q.type === 'multiple' && q.answers.length > 0
				? q.answers
				: [
						{ id: 1, text: '', correct: false },
						{ id: 2, text: '', correct: false }
					]
		)
	}

	const moveDraftQuestion = (oldIndex: number, newIndex: number) => {
		if (
			isNaN(newIndex) ||
			newIndex < 0 ||
			newIndex >= draftQuestions.length ||
			oldIndex === newIndex
		)
			return
		const items = [...draftQuestions]
		const [moved] = items.splice(oldIndex, 1)
		items.splice(newIndex, 0, moved)
		setDraftQuestions(items)
	}

	const saveExam = async () => {
		if (!newTitle.trim()) {
			toast.error('Введите название теста')
			return
		}
		if (draftQuestions.length === 0) {
			toast.error('Добавьте хотя бы один вопрос')
			return
		}
		if (!selectedLectureId) {
			toast.error('Выберите лекцию')
			return
		}
		setSaving(true)
		try {
			const dto = {
				lectureId: String(selectedLectureId),
				title: newTitle.trim(),
				totalTimeSec: newTotalTime ? parseInt(newTotalTime) * 60 : null,
				questions: draftQuestions.map(q => ({
					text: q.text,
					type: (q.type === 'multiple' ? 'MULTIPLE' : 'OPEN') as
						| 'MULTIPLE'
						| 'OPEN',
					timeLimitSec: q.time ? parseInt(q.time) : null,
					options:
						q.type === 'multiple'
							? q.answers.map(a => ({ text: a.text, correct: a.correct }))
							: undefined
				}))
			}
			if (editingExamId) {
				await updateExam(editingExamId, dto)
				toast.success('Тест обновлён')
			} else {
				await createExam(dto)
				toast.success('Тест создан')
			}
			setEditingExamId(null)
			reloadExams()
			setView('list')
		} catch {
			toast.error('Не удалось сохранить тест')
		} finally {
			setSaving(false)
		}
	}

	const openStats = async (examId: string) => {
		try {
			const [detail, subs] = await Promise.all([
				loadExamDetail(examId),
				getExamSubmissions(examId)
			])
			setSubmissions(subs as ApiSubmission[])
			setSelectedExamId(examId)
			setView('stats')
		} catch {
			toast.error('Не удалось загрузить результаты')
		}
	}

	const handleLaunch = async (examId: string) => {
		try {
			await launchExam(examId)
			await broadcastExam(examId, String(selectedLectureId))
			toast.success('Тест запущен и разослан студентам')
			reloadExams()
		} catch {
			toast.error('Не удалось запустить тест')
		}
	}

	const handleDuplicate = async (examId: string) => {
		try {
			await duplicateExam(examId)
			toast.success('Тест скопирован как DRAFT')
			reloadExams()
		} catch {
			toast.error('Не удалось дублировать тест')
		}
	}

	const handleClose = async (examId: string) => {
		try {
			await closeExam(examId)
			toast.success('Тест закрыт')
			reloadExams()
		} catch {
			toast.error('Не удалось закрыть тест')
		}
	}

	const handleImportGift = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file || !selectedLectureId) return
		e.target.value = ''
		const title = file.name.replace(/\.[^.]+$/, '')
		setImporting(true)
		try {
			await importGift(String(selectedLectureId), title, file)
			toast.success('Тест импортирован из GIFT')
			reloadExams()
		} catch {
			toast.error('Не удалось импортировать GIFT-файл')
		} finally {
			setImporting(false)
		}
	}

	const handleExportGift = async (examId: string, examTitle: string) => {
		try {
			await exportGift(examId, examTitle)
		} catch {
			toast.error('Не удалось экспортировать тест')
		}
	}

	const handleGrade = async (answerId: string, score: number) => {
		try {
			await gradeAnswer(answerId, score)
			setSubmissions(subs =>
				subs.map(s => {
					const newAnswers = s.answers.map(a =>
						a.answerId === answerId ? { ...a, score } : a
					)
					const hasUngraded = newAnswers.some(a => a.score == null)
					const totalScore = newAnswers.reduce(
						(sum, a) => sum + (a.score ?? 0),
						0
					)
					return { ...s, answers: newAnswers, hasUngraded, totalScore }
				})
			)
			toast.success('Оценка сохранена')
		} catch {
			toast.error('Не удалось сохранить оценку')
		}
	}

	const Breadcrumbs = ({
		items
	}: {
		items: { label: string; onClick?: () => void }[]
	}) => (
		<div className="flex items-center gap-1 text-sm text-neutral-500 mb-1">
			{items.map((item, i) => (
				<span
					key={i}
					className="flex items-center gap-1"
				>
					{i > 0 && <span>/</span>}
					{item.onClick ? (
						<button
							onClick={item.onClick}
							className="hover:text-orange-500 transition-colors"
						>
							{item.label}
						</button>
					) : (
						<span className="text-neutral-900">{item.label}</span>
					)}
				</span>
			))}
		</div>
	)

	if (view === 'student-detail' && examDetail && selectedChatId !== null) {
		const sub = submissions.find(s => s.chatId === selectedChatId)
		if (!sub) {
			setView('stats')
			return null
		}

		return (
			<div className="p-4 sm:p-6 lg:p-8">
				<Breadcrumbs
					items={[
						{ label: 'Тесты', onClick: () => setView('list') },
						{ label: examDetail.title, onClick: () => setView('stats') },
						{ label: `Студент (chatId: ${sub.chatId})` }
					]}
				/>
				<h1 className="mb-1">Студент #{sub.chatId}</h1>
				<p className="text-sm text-neutral-500 mb-6">
					Итого: {sub.totalScore}/{sub.maxScore}
					{sub.hasUngraded && (
						<span className="text-orange-500 ml-2">
							Есть непроверенные ответы
						</span>
					)}
				</p>

				<div className="space-y-4">
					{examDetail.questions.map((q, i) => {
						const ans = sub.answers.find(a => a.questionId === q.id)
						return (
							<div
								key={q.id}
								className="bg-white rounded-xl p-5 border border-neutral-200"
							>
								<div className="flex items-start gap-3 mb-3">
									<div className="w-7 h-7 bg-orange-500 text-white rounded-lg flex items-center justify-center text-sm flex-shrink-0">
										{i + 1}
									</div>
									<div className="flex-1">
										<p className="text-sm mb-1">{q.text}</p>
										<div className="flex gap-2 text-xs text-neutral-500">
											<span className="px-1.5 py-0.5 bg-neutral-100 rounded">
												{q.type === 'MULTIPLE'
													? 'Множ. выбор'
													: 'Открытый ответ'}
											</span>
											{q.timeLimitSec && (
												<span className="flex items-center gap-0.5">
													<Clock className="w-3 h-3" />
													{q.timeLimitSec}с
												</span>
											)}
										</div>
									</div>
									{ans && (
										<div
											className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
												ans.score === null
													? 'bg-yellow-100 text-yellow-700'
													: ans.score >= ans.maxScore * 0.7
														? 'bg-green-100 text-green-700'
														: 'bg-red-100 text-red-700'
											}`}
										>
											{ans.score === null
												? 'Не проверено'
												: `${ans.score}/${ans.maxScore}`}
										</div>
									)}
								</div>

								{q.type === 'MULTIPLE' && (
									<div className="space-y-1.5 ml-10">
										{q.options.map(opt => {
											const selected = ans?.selectedOptionId === opt.id
											const correct = ans?.correct ?? false
											return (
												<div
													key={opt.id}
													className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
														selected && correct
															? 'bg-green-50 border border-green-200'
															: selected && !correct
																? 'bg-red-50 border border-red-200'
																: 'bg-neutral-50 border border-neutral-200'
													}`}
												>
													<div
														className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
															selected
																? correct
																	? 'bg-green-500 border-green-500 text-white'
																	: 'bg-red-500 border-red-500 text-white'
																: 'border-neutral-300'
														}`}
													>
														{selected && <Check className="w-3 h-3" />}
													</div>
													<span className="flex-1">{opt.text}</span>
												</div>
											)
										})}
									</div>
								)}

								{q.type === 'OPEN' && ans && (
									<div className="ml-10 space-y-3">
										<div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
											<div className="text-xs text-neutral-500 mb-1">
												Ответ студента:
											</div>
											<p className="text-sm">
												{ans.openText || (
													<span className="text-neutral-400 italic">
														Пустой ответ
													</span>
												)}
											</p>
										</div>
										<div>
											<label className="text-xs text-neutral-500 mb-1 block">
												Оценка (0–{ans.maxScore}):
											</label>
											<div className="flex items-center gap-2">
												<input
													type="number"
													min={0}
													max={ans.maxScore}
													defaultValue={ans.score ?? ''}
													onBlur={e => {
														const val = Math.min(
															ans.maxScore,
															Math.max(0, parseInt(e.target.value) || 0)
														)
														handleGrade(ans.answerId, val)
													}}
													className="w-20 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
												/>
												<span className="text-sm text-neutral-500">
													из {ans.maxScore}
												</span>
												{ans.score === null && (
													<span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
														Требует проверки
													</span>
												)}
											</div>
										</div>
									</div>
								)}
							</div>
						)
					})}
				</div>
			</div>
		)
	}

	if (view === 'stats' && examDetail) {
		const isSurvey = examDetail.examType === 'SURVEY'

		if (isSurvey) {
			// Survey: show rating distribution
			const ratingCounts: Record<number, number> = {
				1: 0,
				2: 0,
				3: 0,
				4: 0,
				5: 0
			}
			submissions.forEach(r => {
				r.answers.forEach(a => {
					const match = a.selectedOptionText?.match(/^(\d)/)
					if (match)
						ratingCounts[parseInt(match[1])] =
							(ratingCounts[parseInt(match[1])] || 0) + 1
				})
			})
			const total = submissions.length
			const avgRating =
				total > 0
					? (
							Object.entries(ratingCounts).reduce(
								(s, [k, v]) => s + parseInt(k) * v,
								0
							) / total
						).toFixed(1)
					: '—'

			return (
				<div className="p-4 sm:p-6 lg:p-8">
					<Breadcrumbs
						items={[
							{ label: 'Тесты', onClick: () => setView('list') },
							{ label: examDetail.title }
						]}
					/>
					<h1 className="mb-1">{examDetail.title}</h1>
					<p className="text-sm text-neutral-500 mb-6">
						{total} ответов · {getStatusLabel(examDetail.status).text}
					</p>

					<div className="grid grid-cols-2 gap-3 mb-6">
						<div className="bg-white rounded-xl p-4 border border-neutral-200">
							<div className="text-3xl mb-1 text-orange-500">{avgRating}</div>
							<div className="text-sm text-neutral-500">Средняя оценка</div>
						</div>
						<div className="bg-white rounded-xl p-4 border border-neutral-200">
							<div className="text-3xl mb-1">{total}</div>
							<div className="text-sm text-neutral-500">Ответили</div>
						</div>
					</div>

					<div className="bg-white rounded-xl p-5 border border-neutral-200">
						<h3 className="text-sm mb-4">Распределение оценок</h3>
						<div className="space-y-3">
							{[5, 4, 3, 2, 1].map(star => {
								const count = ratingCounts[star] || 0
								const pct = total > 0 ? Math.round((count / total) * 100) : 0
								return (
									<div
										key={star}
										className="flex items-center gap-3"
									>
										<span className="text-sm w-16 flex-shrink-0">
											{'⭐'.repeat(star)}
										</span>
										<div className="flex-1 bg-neutral-100 rounded-full h-4 overflow-hidden">
											<div
												className="h-full bg-orange-400 rounded-full transition-all"
												style={{ width: `${pct}%` }}
											/>
										</div>
										<span className="text-sm text-neutral-500 w-16 text-right flex-shrink-0">
											{count} ({pct}%)
										</span>
									</div>
								)
							})}
						</div>
					</div>
				</div>
			)
		}

		const avg =
			submissions.length > 0
				? Math.round(
						submissions.reduce((s, r) => s + r.totalScore, 0) /
							submissions.length
					)
				: 0
		const maxPossible = submissions[0]?.maxScore ?? 0
		const passed = submissions.filter(
			r => r.maxScore > 0 && r.totalScore >= r.maxScore * 0.7
		).length
		const ungraded = submissions.filter(r => r.hasUngraded).length

		return (
			<div className="p-4 sm:p-6 lg:p-8">
				<Breadcrumbs
					items={[
						{ label: 'Тесты', onClick: () => setView('list') },
						{ label: examDetail.title }
					]}
				/>
				<h1 className="mb-1">{examDetail.title}</h1>
				<p className="text-sm text-neutral-500 mb-6">
					{examDetail.totalTimeSec
						? `${Math.round(examDetail.totalTimeSec / 60)} мин.`
						: 'Без ограничения'}
					{' · '}
					{examDetail.questions.length} вопросов
					{' · '}
					{getStatusLabel(examDetail.status).text}
				</p>

				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
					{[
						{ val: submissions.length, label: 'Прошли тест' },
						{ val: `${avg}/${maxPossible}`, label: 'Средний балл' },
						{ val: passed, label: 'Сдали (≥70%)', cls: 'text-green-600' },
						{
							val: ungraded,
							label: 'Ждут проверки',
							cls: ungraded > 0 ? 'text-yellow-600' : ''
						}
					].map((s, i) => (
						<div
							key={i}
							className="bg-white rounded-xl p-4 border border-neutral-200"
						>
							<div className={`text-2xl mb-1 ${s.cls ?? ''}`}>{s.val}</div>
							<div className="text-sm text-neutral-500">{s.label}</div>
						</div>
					))}
				</div>

				{submissions.length > 0 ? (
					<div className="bg-white rounded-xl p-5 border border-neutral-200">
						<h3 className="text-sm mb-4">
							Результаты — нажмите для подробностей
						</h3>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b border-neutral-200">
										<th className="text-left py-2.5 px-3 text-sm text-neutral-600">
											Студент
										</th>
										<th className="text-left py-2.5 px-3 text-sm text-neutral-600">
											Баллы
										</th>
										<th className="text-left py-2.5 px-3 text-sm text-neutral-600">
											Статус
										</th>
									</tr>
								</thead>
								<tbody>
									{submissions.map((r, i) => (
										<tr
											key={i}
											onClick={() => {
												setSelectedChatId(r.chatId)
												setView('student-detail')
											}}
											className="border-b border-neutral-100 hover:bg-orange-50 cursor-pointer transition-colors"
										>
											<td className="py-2.5 px-3 text-sm flex items-center gap-2">
												Студент #{r.chatId}
												{r.hasUngraded && (
													<span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
												)}
											</td>
											<td className="py-2.5 px-3 text-sm">
												{r.totalScore}/{r.maxScore}
											</td>
											<td className="py-2.5 px-3">
												{r.hasUngraded ? (
													<span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
														На проверке
													</span>
												) : (
													<span
														className={`text-xs px-2 py-0.5 rounded-full ${r.maxScore > 0 && r.totalScore >= r.maxScore * 0.7 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
													>
														{r.maxScore > 0 && r.totalScore >= r.maxScore * 0.7
															? 'Сдал'
															: 'Не сдал'}
													</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				) : (
					<div className="bg-white rounded-xl p-8 border border-neutral-200 text-center text-neutral-500 text-sm">
						Тест ещё никто не проходил
					</div>
				)}
			</div>
		)
	}

	// Create view
	if (view === 'create') {
		return (
			<div className="p-4 sm:p-6 lg:p-8">
				<Breadcrumbs
					items={[
						{ label: 'Тесты', onClick: () => setView('list') },
						{ label: editingExamId ? 'Редактирование теста' : 'Создание теста' }
					]}
				/>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
					<h1 className="mb-0">
						{editingExamId ? 'Редактирование теста' : 'Создание теста'}
					</h1>
					<button
						onClick={saveExam}
						disabled={saving}
						className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 text-sm disabled:opacity-60 self-start sm:self-auto"
					>
						<Check className="w-4 h-4" />{' '}
						{saving
							? 'Сохранение...'
							: editingExamId
								? 'Сохранить изменения'
								: 'Сохранить тест'}
					</button>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
					<div className="space-y-4">
						<div className="bg-white rounded-xl p-5 border border-neutral-200">
							<div className="mb-4">
								<label className="block text-sm mb-1.5">Название теста</label>
								<input
									type="text"
									value={newTitle}
									onChange={e => setNewTitle(e.target.value)}
									placeholder="напр. Тест: Основы алгоритмов"
									className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
								/>
							</div>
							<div>
								<label className="block text-sm mb-1.5">
									Общее время на тест (мин), пусто = без ограничения
								</label>
								<input
									type="number"
									value={newTotalTime}
									onChange={e => setNewTotalTime(e.target.value)}
									placeholder="15"
									className="w-full sm:w-40 px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
								/>
							</div>
						</div>

						<div className="bg-white rounded-xl p-5 border border-neutral-200">
							<h3 className="text-sm mb-4">Новый вопрос</h3>
							<div className="mb-4">
								<label className="block text-sm mb-2">Тип</label>
								<div className="flex gap-2">
									{(['multiple', 'open'] as const).map(t => (
										<button
											key={t}
											onClick={() => setQuestionType(t)}
											className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm ${questionType === t ? 'border-orange-500 bg-orange-50' : 'border-neutral-300'}`}
										>
											{t === 'multiple' ? 'Мн. выбор' : 'Открытый'}
										</button>
									))}
								</div>
							</div>

							<div className="mb-4">
								<label className="block text-sm mb-1.5">Текст вопроса</label>
								<textarea
									value={questionText}
									onChange={e => setQuestionText(e.target.value)}
									placeholder="Введите вопрос..."
									rows={3}
									className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
								/>
							</div>

							{questionType === 'multiple' && (
								<div className="mb-4">
									<label className="block text-sm mb-2">Варианты ответов</label>
									<div className="space-y-2">
										{answers.map(a => (
											<div
												key={a.id}
												className="flex items-center gap-2"
											>
												<button
													onClick={() =>
														setAnswers(
															answers.map(x =>
																x.id === a.id
																	? { ...x, correct: !x.correct }
																	: x
															)
														)
													}
													className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${a.correct ? 'bg-orange-500 border-orange-500 text-white' : 'border-neutral-300'}`}
												>
													{a.correct && <Check className="w-3 h-3" />}
												</button>
												<input
													type="text"
													value={a.text}
													onChange={e =>
														setAnswers(
															answers.map(x =>
																x.id === a.id
																	? { ...x, text: e.target.value }
																	: x
															)
														)
													}
													placeholder="Вариант..."
													className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${a.correct ? 'border-orange-300 bg-orange-50' : 'border-neutral-300 bg-neutral-50'}`}
												/>
												{answers.length > 2 && (
													<button
														onClick={() =>
															setAnswers(answers.filter(x => x.id !== a.id))
														}
														className="text-neutral-400 hover:text-red-500"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												)}
											</div>
										))}
									</div>
									<button
										onClick={() =>
											setAnswers([
												...answers,
												{ id: Date.now(), text: '', correct: false }
											])
										}
										className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 mt-2"
									>
										<Plus className="w-4 h-4" /> Добавить вариант
									</button>
								</div>
							)}

							<div className="mb-4">
								<label className="block text-sm mb-1.5">
									Время на вопрос (сек), пусто = без лимита
								</label>
								<input
									type="number"
									value={timeLimit}
									onChange={e => setTimeLimit(e.target.value)}
									placeholder="60"
									className="w-full sm:w-40 px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
								/>
							</div>

							<div className="flex gap-2">
								<button
									onClick={addQuestion}
									className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg hover:bg-orange-600 text-sm"
								>
									{editingQuestionId
										? 'Сохранить изменения'
										: 'Добавить вопрос'}
								</button>
								{editingQuestionId && (
									<button
										onClick={() => {
											setDraftQuestions(
												draftQuestions.filter(x => x.id !== editingQuestionId)
											)
											setEditingQuestionId(null)
											setQuestionText('')
											setAnswers([
												{ id: Date.now() + 1, text: '', correct: false },
												{ id: Date.now() + 2, text: '', correct: false }
											])
											toast.success('Вопрос удален')
										}}
										className="px-4 py-2.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 text-sm"
									>
										Удалить
									</button>
								)}
							</div>
						</div>
					</div>

					<div className="bg-white rounded-xl p-4 border border-neutral-200 h-fit lg:sticky lg:top-4">
						<h3 className="text-sm mb-4">Вопросы ({draftQuestions.length})</h3>
						{draftQuestions.length === 0 ? (
							<div className="text-sm text-neutral-500 text-center py-8">
								Добавьте вопросы
							</div>
						) : (
							<div className="space-y-2 max-h-[60vh] overflow-y-auto">
								{draftQuestions.map((q, i) => (
									<div
										key={q.id}
										className="border border-neutral-200 rounded-lg p-3 group"
									>
										<div className="flex items-start gap-2">
											<input
												type="number"
												min="1"
												max={draftQuestions.length}
												value={i + 1}
												onChange={e => {
													const val = parseInt(e.target.value)
													if (!isNaN(val)) moveDraftQuestion(i, val - 1)
												}}
												className="w-10 h-6 bg-orange-500 text-white rounded outline-none text-center text-xs flex-shrink-0 font-medium"
											/>
											<div className="flex-1 min-w-0">
												<p className="text-sm">{q.text}</p>
												{q.type === 'multiple' &&
													q.answers &&
													q.answers.length > 0 && (
														<div className="mt-2 space-y-1.5 pl-1 border-l-2 border-neutral-100">
															{q.answers.map((ans, idx) => (
																<div
																	key={idx}
																	className="flex items-start gap-1.5 text-xs"
																>
																	<span
																		className={`mt-0.5 flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center ${ans.correct ? 'border-green-500 bg-green-500 text-white' : 'border-neutral-300 bg-white'}`}
																	>
																		{ans.correct && (
																			<Check className="w-2.5 h-2.5" />
																		)}
																	</span>
																	<span
																		className={
																			ans.correct
																				? 'text-green-700 font-medium'
																				: 'text-neutral-600'
																		}
																	>
																		{ans.text}
																	</span>
																</div>
															))}
														</div>
													)}
												<div className="flex gap-2 text-xs text-neutral-500 mt-2">
													<span className="px-1.5 py-0.5 bg-neutral-100 rounded">
														{q.type === 'multiple' ? 'Выбор' : 'Открытый'}
													</span>
													{q.time && (
														<span>
															<Clock className="w-3 h-3 inline" /> {q.time}с
														</span>
													)}
												</div>
											</div>
											<div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity">
												<button
													onClick={() => editDraftQuestion(q)}
													className="text-neutral-300 hover:text-orange-500"
												>
													<Pencil className="w-3.5 h-3.5" />
												</button>
												<button
													onClick={() =>
														setDraftQuestions(
															draftQuestions.filter(x => x.id !== q.id)
														)
													}
													className="text-neutral-300 hover:text-red-500"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		)
	}

	// List view
	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="mb-1">Тесты</h1>
					<p className="text-sm text-neutral-500">
						Создавайте и управляйте тестами для лекций
					</p>
				</div>
				<div className="flex gap-2 self-start sm:self-auto">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={startCreate}
								disabled={!selectedLectureId}
								className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 text-sm disabled:opacity-40"
							>
								<Plus className="w-4 h-4" /> Создать тест
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Создать новый тест для выбранной лекции</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={() => giftInputRef.current?.click()}
								disabled={!selectedLectureId || importing}
								className="flex items-center gap-2 border border-neutral-300 px-4 py-2.5 rounded-full text-sm hover:bg-neutral-50 disabled:opacity-40"
							>
								<Upload className="w-4 h-4" />{' '}
								{importing ? 'Импорт...' : 'Импорт GIFT'}
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Импортировать тест из GIFT формата</p>
						</TooltipContent>
					</Tooltip>
					<input
						ref={giftInputRef}
						type="file"
						accept=".gift,.txt"
						className="hidden"
						onChange={handleImportGift}
					/>
				</div>
			</div>

			<div className="mb-6">
				<select
					value={selectedLectureId}
					onChange={e => setSelectedLectureId(Number(e.target.value))}
					className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
				>
					<option value={0}>Выберите лекцию</option>
					{lectures.map(l => (
						<option
							key={l.id}
							value={l.id}
						>
							{l.name}
						</option>
					))}
				</select>
			</div>

			{!selectedLectureId && (
				<div className="bg-white rounded-xl p-12 border border-neutral-200 text-center text-neutral-400 text-sm">
					Выберите лекцию для просмотра тестов
				</div>
			)}

			{selectedLectureId > 0 && loadingExams && (
				<div className="text-center py-12 text-neutral-400 text-sm">
					Загрузка...
				</div>
			)}

			{selectedLectureId > 0 && !loadingExams && exams.length === 0 && (
				<div className="bg-white rounded-xl p-12 border border-neutral-200 text-center">
					<p className="text-neutral-500 mb-4">
						Нет тестов для этой лекции. Создайте первый!
					</p>
					<button
						onClick={startCreate}
						className="bg-orange-500 text-white px-5 py-2.5 rounded-lg hover:bg-orange-600 text-sm"
					>
						Создать тест
					</button>
				</div>
			)}

			{selectedLectureId > 0 && !loadingExams && exams.length > 0 && (
				<div className="space-y-3">
					{exams.map(exam => {
						const status = getStatusLabel(exam.status)
						return (
							<div
								key={exam.id}
								className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
							>
								<button
									onClick={() =>
										setExpandedExam(expandedExam === exam.id ? null : exam.id)
									}
									className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
											<ClipboardIcon className="w-5 h-5 text-orange-600" />
										</div>
										<div className="text-left min-w-0">
											<div className="text-sm truncate flex items-center gap-2">
												{exam.title}
												<span
													className={`text-xs px-1.5 py-0.5 rounded-full ${status.cls}`}
												>
													{status.text}
												</span>
											</div>
											<div className="text-xs text-neutral-500">
												{exam.questionCount ?? 0} вопросов
												{exam.totalTimeSec && (
													<>
														{' '}
														&middot; {Math.round(exam.totalTimeSec / 60)} мин.
													</>
												)}
											</div>
										</div>
									</div>
									{expandedExam === exam.id ? (
										<ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
									) : (
										<ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
									)}
								</button>

								{expandedExam === exam.id && (
									<div className="border-t border-neutral-200 p-4">
										<div className="flex flex-wrap gap-2 pt-1">
											<button
												onClick={() => openStats(exam.id)}
												className="flex items-center gap-1 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50"
											>
												<BarChart3 className="w-3.5 h-3.5" /> Результаты
											</button>
											{exam.status === 'DRAFT' && (
												<button
													onClick={() => startEdit(exam.id)}
													className="flex items-center gap-1 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50"
												>
													<Pencil className="w-3.5 h-3.5" /> Редактировать
												</button>
											)}
											<button
												onClick={() => handleDuplicate(exam.id)}
												className="flex items-center gap-1 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50"
											>
												<Copy className="w-3.5 h-3.5" /> Дублировать
											</button>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														onClick={() =>
															handleExportGift(exam.id, exam.title)
														}
														className="flex items-center gap-1 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50"
													>
														<Download className="w-3.5 h-3.5" /> Экспорт GIFT
													</button>
												</TooltipTrigger>
												<TooltipContent>
													<p>Экспортировать тест в GIFT формат</p>
												</TooltipContent>
											</Tooltip>
											{exam.status === 'DRAFT' && (
												<button
													onClick={() => handleLaunch(exam.id)}
													className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
												>
													<Send className="w-3.5 h-3.5" /> Запустить
												</button>
											)}
											{exam.status === 'ACTIVE' && (
												<button
													onClick={() => handleClose(exam.id)}
													className="flex items-center gap-1 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50"
												>
													Закрыть тест
												</button>
											)}
											<button
												onClick={() => handleDelete(exam.id)}
												className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 ml-auto"
											>
												<Trash2 className="w-3.5 h-3.5" /> Удалить
											</button>
										</div>
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

function ClipboardIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect
				x="8"
				y="2"
				width="8"
				height="4"
				rx="1"
				ry="1"
			/>
			<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
			<path d="M12 11h4" />
			<path d="M12 16h4" />
			<path d="M8 11h.01" />
			<path d="M8 16h.01" />
		</svg>
	)
}
