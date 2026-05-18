import {
	BarChart3,
	Check,
	ChevronDown,
	ChevronRight,
	Clock,
	Pencil,
	Plus,
	Trash2
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LectureListItem, listLectures } from '../app/api/client'
import {
	QuestionDetailDto,
	QuestionSendDto,
	createQuestion,
	deleteQuestion,
	getQuestionBank,
	getQuestionSends,
	updateQuestion
} from '../app/api/quiz.api'

type View = 'list' | 'create' | 'analytics'

interface DraftOption {
	id: number
	text: string
	correct: boolean
}

export function TestsPage() {
	const [lectures, setLectures] = useState<LectureListItem[]>([])
	const [selectedLectureId, setSelectedLectureId] = useState<number>(0)

	const [questions, setQuestions] = useState<QuestionDetailDto[]>([])
	const [sends, setSends] = useState<QuestionSendDto[]>([])
	const [loadingQuestions, setLoadingQuestions] = useState(false)
	const [view, setView] = useState<View>('list')

	// Form state
	const [editingId, setEditingId] = useState<string | null>(null)
	const [qText, setQText] = useState('')
	const [qType, setQType] = useState<'MULTIPLE' | 'OPEN'>('MULTIPLE')
	const [qTime, setQTime] = useState('')
	const [options, setOptions] = useState<DraftOption[]>([
		{ id: 1, text: '', correct: false },
		{ id: 2, text: '', correct: false }
	])
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		listLectures()
			.then(setLectures)
			.catch(() => toast.error('Не удалось загрузить лекции'))
	}, [])

	const reloadQuestions = (lectureId: number) => {
		setLoadingQuestions(true)
		Promise.all([
			getQuestionBank(lectureId),
			getQuestionSends(lectureId)
		])
			.then(([qs, ss]) => {
				setQuestions(qs)
				setSends(ss)
			})
			.catch(() => toast.error('Не удалось загрузить вопросы'))
			.finally(() => setLoadingQuestions(false))
	}

	useEffect(() => {
		if (!selectedLectureId) { setQuestions([]); setSends([]); return }
		reloadQuestions(selectedLectureId)
	}, [selectedLectureId])

	const resetForm = () => {
		setEditingId(null)
		setQText('')
		setQType('MULTIPLE')
		setQTime('')
		setOptions([
			{ id: Date.now(), text: '', correct: false },
			{ id: Date.now() + 1, text: '', correct: false }
		])
	}

	const startCreate = () => { resetForm(); setView('create') }

	const startEdit = (q: QuestionDetailDto) => {
		setEditingId(q.id)
		setQText(q.text)
		setQType(q.type)
		setQTime(q.timeLimitSec ? String(q.timeLimitSec) : '')
		setOptions(
			q.type === 'MULTIPLE' && q.options.length > 0
				? q.options.map((o, i) => ({ id: i + 1, text: o.text, correct: o.correct ?? false }))
				: [{ id: 1, text: '', correct: false }, { id: 2, text: '', correct: false }]
		)
		setView('create')
	}

	const handleSave = async () => {
		if (!qText.trim()) { toast.error('Введите текст вопроса'); return }
		if (!selectedLectureId) { toast.error('Выберите лекцию'); return }
		if (qType === 'MULTIPLE' && !options.some(o => o.correct)) {
			toast.error('Отметьте правильный ответ'); return
		}
		if (qType === 'MULTIPLE' && options.some(o => !o.text.trim())) {
			toast.error('Заполните все варианты ответа'); return
		}
		setSaving(true)
		try {
			const dto = {
				lectureId: selectedLectureId,
				text: qText.trim(),
				type: qType,
				timeLimitSec: qTime ? parseInt(qTime) : null,
				options: qType === 'MULTIPLE'
					? options.map(o => ({ text: o.text, correct: o.correct }))
					: undefined
			}
			if (editingId) {
				await updateQuestion(editingId, dto)
				toast.success('Вопрос обновлён')
			} else {
				await createQuestion(dto)
				toast.success('Вопрос создан')
			}
			reloadQuestions(selectedLectureId)
			setView('list')
		} catch {
			toast.error('Не удалось сохранить вопрос')
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Удалить вопрос?')) return
		try {
			await deleteQuestion(id)
			toast.success('Вопрос удалён')
			reloadQuestions(selectedLectureId)
		} catch {
			toast.error('Не удалось удалить вопрос')
		}
	}

	// Аналитика: считаем по sends для каждого вопроса
	const getSendsForQuestion = (questionId: string) =>
		sends.filter(s => s.questionId === questionId)

	// ── Create/Edit view ─────────────────────────────────────────────────────
	if (view === 'create') {
		return (
			<div className="p-4 sm:p-6 lg:p-8">
				<div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
					<button onClick={() => setView('list')} className="hover:text-orange-500">Банк вопросов</button>
					<span>/</span>
					<span className="text-neutral-900">{editingId ? 'Редактирование' : 'Новый вопрос'}</span>
				</div>
				<div className="flex items-center justify-between mb-6">
					<h1 className="mb-0">{editingId ? 'Редактировать вопрос' : 'Новый вопрос'}</h1>
					<button
						onClick={handleSave}
						disabled={saving}
						className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 text-sm disabled:opacity-60"
					>
						<Check className="w-4 h-4" /> {saving ? 'Сохранение...' : 'Сохранить'}
					</button>
				</div>

				<div className="max-w-2xl space-y-4">
					<div className="bg-white rounded-xl p-5 border border-neutral-200 space-y-4">
						<div>
							<label className="block text-sm mb-1.5">Тип вопроса</label>
							<div className="flex gap-2">
								{(['MULTIPLE', 'OPEN'] as const).map(t => (
									<button
										key={t}
										onClick={() => setQType(t)}
										className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm ${qType === t ? 'border-orange-500 bg-orange-50' : 'border-neutral-300'}`}
									>
										{t === 'MULTIPLE' ? 'Множественный выбор' : 'Открытый ответ'}
									</button>
								))}
							</div>
						</div>

						<div>
							<label className="block text-sm mb-1.5">Текст вопроса</label>
							<textarea
								value={qText}
								onChange={e => setQText(e.target.value)}
								rows={3}
								placeholder="Введите вопрос..."
								className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
							/>
						</div>

						{qType === 'MULTIPLE' && (
							<div>
								<label className="block text-sm mb-2">Варианты ответов</label>
								<div className="space-y-2">
									{options.map(o => (
										<div key={o.id} className="flex items-center gap-2">
											<button
												onClick={() => setOptions(options.map(x => x.id === o.id ? { ...x, correct: !x.correct } : x))}
												className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${o.correct ? 'bg-orange-500 border-orange-500 text-white' : 'border-neutral-300'}`}
											>
												{o.correct && <Check className="w-3 h-3" />}
											</button>
											<input
												type="text"
												value={o.text}
												onChange={e => setOptions(options.map(x => x.id === o.id ? { ...x, text: e.target.value } : x))}
												placeholder="Вариант..."
												className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${o.correct ? 'border-orange-300 bg-orange-50' : 'border-neutral-300 bg-neutral-50'}`}
											/>
											{options.length > 2 && (
												<button onClick={() => setOptions(options.filter(x => x.id !== o.id))} className="text-neutral-400 hover:text-red-500">
													<Trash2 className="w-4 h-4" />
												</button>
											)}
										</div>
									))}
								</div>
								<button
									onClick={() => setOptions([...options, { id: Date.now(), text: '', correct: false }])}
									className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 mt-2"
								>
									<Plus className="w-4 h-4" /> Добавить вариант
								</button>
							</div>
						)}

						<div>
							<label className="block text-sm mb-1.5">Лимит времени (сек), пусто = без лимита</label>
							<input
								type="number"
								value={qTime}
								onChange={e => setQTime(e.target.value)}
								placeholder="60"
								className="w-40 px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
							/>
						</div>
					</div>
				</div>
			</div>
		)
	}

	// ── Analytics view ───────────────────────────────────────────────────────
	if (view === 'analytics') {
		const totalSends = sends.length
		const totalResponses = sends.reduce((s, x) => s + x.totalResponses, 0)
		const totalCorrect = sends.reduce((s, x) => s + x.correctResponses, 0)

		return (
			<div className="p-4 sm:p-6 lg:p-8">
				<div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
					<button onClick={() => setView('list')} className="hover:text-orange-500">Банк вопросов</button>
					<span>/</span>
					<span className="text-neutral-900">Аналитика</span>
				</div>
				<h1 className="mb-6">Аналитика по вопросам</h1>

				<div className="grid grid-cols-3 gap-3 mb-6">
					{[
						{ val: totalSends, label: 'Отправок' },
						{ val: totalResponses, label: 'Ответов' },
						{ val: totalSends > 0 ? `${totalCorrect}/${totalResponses}` : '—', label: 'Правильных' }
					].map((s, i) => (
						<div key={i} className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
							<div className="text-2xl font-medium mb-1">{s.val}</div>
							<div className="text-sm text-neutral-500">{s.label}</div>
						</div>
					))}
				</div>

				{sends.length === 0 ? (
					<div className="bg-white rounded-xl p-12 border border-neutral-200 text-center text-neutral-400 text-sm">
						Вопросы ещё не отправлялись студентам в этой лекции
					</div>
				) : (
					<div className="space-y-3">
						{sends.map(send => {
							const pct = send.totalResponses > 0
								? Math.round((send.correctResponses / send.totalResponses) * 100)
								: 0
							return (
								<div key={send.sendId} className="bg-white rounded-xl p-5 border border-neutral-200">
									<div className="flex items-start gap-3 mb-3">
										<div className="flex-shrink-0 px-2 py-1 bg-neutral-100 text-neutral-600 rounded text-xs">
											Слайд {send.slideNumber}
										</div>
										<div className="flex-1">
											<p className="text-sm">{send.questionText}</p>
											<div className="flex gap-2 mt-1 text-xs text-neutral-500">
												<span className="px-1.5 py-0.5 bg-neutral-100 rounded">
													{send.questionType === 'MULTIPLE' ? 'Множ. выбор' : 'Открытый'}
												</span>
												{send.timeLimitSec && (
													<span className="flex items-center gap-0.5">
														<Clock className="w-3 h-3" />{send.timeLimitSec}с
													</span>
												)}
											</div>
										</div>
									</div>

									{send.questionType === 'MULTIPLE' ? (
										<div className="ml-0 flex items-center gap-3 text-sm">
											<span className="text-green-600">{send.correctResponses} верно</span>
											<span className="text-red-500">{send.totalResponses - send.correctResponses} неверно</span>
											<span className="text-neutral-400">{send.totalResponses} всего</span>
											{send.totalResponses > 0 && (
												<>
													<div className="flex-1 bg-neutral-100 rounded-full h-2">
														<div
															className="h-2 bg-green-400 rounded-full"
															style={{ width: `${pct}%` }}
														/>
													</div>
													<span className="text-neutral-500 text-xs">{pct}%</span>
												</>
											)}
										</div>
									) : (
										<div className="space-y-1 mt-2">
											<p className="text-xs text-neutral-500 mb-1">{send.totalResponses} ответов:</p>
											{send.openResponses.slice(0, 5).map((r, i) => (
												<div key={i} className="text-xs bg-neutral-50 rounded px-3 py-1.5 text-neutral-700">
													Студент #{r.chatId}: {r.openText}
												</div>
											))}
											{send.openResponses.length > 5 && (
												<p className="text-xs text-neutral-400">и ещё {send.openResponses.length - 5}...</p>
											)}
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

	// ── List view ────────────────────────────────────────────────────────────
	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="mb-1">Банк вопросов</h1>
					<p className="text-sm text-neutral-500">
						Создавайте вопросы и отправляйте их студентам во время лекции
					</p>
				</div>
				<div className="flex gap-2 self-start sm:self-auto">
					<button
						onClick={() => setView('analytics')}
						disabled={!selectedLectureId}
						className="flex items-center gap-2 border border-neutral-300 px-4 py-2.5 rounded-full text-sm hover:bg-neutral-50 disabled:opacity-40"
					>
						<BarChart3 className="w-4 h-4" /> Аналитика
					</button>
					<button
						onClick={startCreate}
						disabled={!selectedLectureId}
						className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 text-sm disabled:opacity-40"
					>
						<Plus className="w-4 h-4" /> Новый вопрос
					</button>
				</div>
			</div>

			<div className="mb-6">
				<select
					value={selectedLectureId}
					onChange={e => setSelectedLectureId(Number(e.target.value))}
					className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
				>
					<option value={0}>Выберите лекцию</option>
					{lectures.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
				</select>
			</div>

			{!selectedLectureId && (
				<div className="bg-white rounded-xl p-12 border border-neutral-200 text-center text-neutral-400 text-sm">
					Выберите лекцию для просмотра банка вопросов
				</div>
			)}

			{selectedLectureId > 0 && loadingQuestions && (
				<div className="text-center py-12 text-neutral-400 text-sm">Загрузка...</div>
			)}

			{selectedLectureId > 0 && !loadingQuestions && questions.length === 0 && (
				<div className="bg-white rounded-xl p-12 border border-neutral-200 text-center">
					<p className="text-neutral-500 mb-4">Вопросов нет. Создайте первый!</p>
					<button onClick={startCreate} className="bg-orange-500 text-white px-5 py-2.5 rounded-lg hover:bg-orange-600 text-sm">
						Создать вопрос
					</button>
				</div>
			)}

			{selectedLectureId > 0 && !loadingQuestions && questions.length > 0 && (
				<div className="space-y-3">
					{questions.map(q => {
						const qSends = getSendsForQuestion(q.id)
						const totalSent = qSends.length
						const totalCorrect = qSends.reduce((s, x) => s + x.correctResponses, 0)
						const totalResp = qSends.reduce((s, x) => s + x.totalResponses, 0)
						return (
							<QuestionCard
								key={q.id}
								question={q}
								totalSent={totalSent}
								totalCorrect={totalCorrect}
								totalResponses={totalResp}
								onEdit={() => startEdit(q)}
								onDelete={() => handleDelete(q.id)}
							/>
						)
					})}
				</div>
			)}
		</div>
	)
}

function QuestionCard({
	question,
	totalSent,
	totalCorrect,
	totalResponses,
	onEdit,
	onDelete
}: {
	question: QuestionDetailDto
	totalSent: number
	totalCorrect: number
	totalResponses: number
	onEdit: () => void
	onDelete: () => void
}) {
	const [expanded, setExpanded] = useState(false)

	return (
		<div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
			>
				<div className="flex items-center gap-3 min-w-0 text-left">
					<div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
						<span className="text-orange-600 text-xs font-bold">
							{question.type === 'MULTIPLE' ? 'M' : 'O'}
						</span>
					</div>
					<div className="min-w-0">
						<p className="text-sm truncate">{question.text}</p>
						<div className="flex gap-2 mt-0.5 text-xs text-neutral-500">
							{question.type === 'MULTIPLE' && (
								<span>{question.options.length} вар.</span>
							)}
							{question.timeLimitSec && (
								<span className="flex items-center gap-0.5">
									<Clock className="w-3 h-3" />{question.timeLimitSec}с
								</span>
							)}
							{totalSent > 0 && (
								<span className="text-orange-600">
									Отправлен {totalSent}×
									{question.type === 'MULTIPLE' && totalResponses > 0 && (
										<> · {totalCorrect}/{totalResponses} верно</>
									)}
								</span>
							)}
						</div>
					</div>
				</div>
				{expanded
					? <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
					: <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
				}
			</button>

			{expanded && (
				<div className="border-t border-neutral-200 p-4">
					{question.type === 'MULTIPLE' && question.options.length > 0 && (
						<div className="space-y-1 mb-4">
							{question.options.map(o => (
								<div key={o.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${o.correct ? 'bg-green-50 border border-green-200' : 'bg-neutral-50 border border-neutral-200'}`}>
									<div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${o.correct ? 'bg-green-500 border-green-500 text-white' : 'border-neutral-300'}`}>
										{o.correct && <Check className="w-3 h-3" />}
									</div>
									<span className="flex-1">{o.text}</span>
								</div>
							))}
						</div>
					)}
					<div className="flex gap-2">
						<button
							onClick={onEdit}
							className="flex items-center gap-1 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50"
						>
							<Pencil className="w-3.5 h-3.5" /> Редактировать
						</button>
						<button
							onClick={onDelete}
							className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 ml-auto"
						>
							<Trash2 className="w-3.5 h-3.5" /> Удалить
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
