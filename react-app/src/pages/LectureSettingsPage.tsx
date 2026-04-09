import {
	Copy,
	Eye,
	EyeOff,
	Globe,
	Loader2,
	Lock,
	Mail,
	Play,
	QrCode,
	Save
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { startLecture, getLecture, getSlideSequence, updateLecture, BASE_URL } from '../app/api/client'

interface SlidePreview {
	index: number
	imageUrl: string
}

export function LectureSettingsPage() {
	const navigate = useNavigate()
	const { lectureId } = useParams<{ lectureId: string }>()
	const [lectureName, setLectureName] = useState('')
	const [description, setDescription] = useState('')
	const [slidePreviews, setSlidePreviews] = useState<SlidePreview[]>([])
	const [loadingLecture, setLoadingLecture] = useState(true)
	const [saving, setSaving] = useState(false)

	const [startSlide, setStartSlide] = useState('1')
	const [accessType, setAccessType] = useState<'open' | 'password' | 'invitation'>('open')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [duration, setDuration] = useState('90')
	const [allowQuestions, setAllowQuestions] = useState(true)
	const [showQR, setShowQR] = useState(false)

	// Load lecture + restore access settings from localStorage
	useEffect(() => {
		if (!lectureId || lectureId === 'new') {
			setLoadingLecture(false)
			return
		}

		// Restore access settings saved locally
		try {
			const saved = localStorage.getItem(`lecture_access_${lectureId}`)
			if (saved) {
				const parsed = JSON.parse(saved)
				if (parsed.accessType) setAccessType(parsed.accessType)
				if (parsed.password) setPassword(parsed.password)
				if (parsed.duration) setDuration(parsed.duration)
				if (parsed.allowQuestions !== undefined) setAllowQuestions(parsed.allowQuestions)
			}
		} catch {}

		;(async () => {
			try {
				setLoadingLecture(true)
				const lecture = await getLecture(parseInt(lectureId))
				setLectureName(lecture.name || '')

				if (lecture.sequenceId) {
					const seq = await getSlideSequence(lecture.sequenceId)
					const slides: SlidePreview[] = (seq.slides || []).map(
						(_: string, idx: number) => ({
							index: idx + 1,
							imageUrl: `${BASE_URL}/slide-sequences/${lecture.sequenceId}/slide/${idx + 1}`
						})
					)
					setSlidePreviews(slides)
					setStartSlide('1')
				}
			} catch (e) {
				toast.error('Не удалось загрузить лекцию')
			} finally {
				setLoadingLecture(false)
			}
		})()
	}, [lectureId])

	// Студенты подключаются через Telegram-бота командой /join
	const BOT_USERNAME = 'lecturer-assistant'
	const telegramLink = `https://t.me/${BOT_USERNAME}?start=join_${lectureId}`
	const joinCommand = `/join ${lectureName || lectureId}`
	const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(telegramLink)}`

	const handleSave = async () => {
		if (!lectureName.trim()) {
			toast.error('Введите название лекции')
			return
		}
		if (accessType === 'password' && !password.trim()) {
			toast.error('Введите пароль')
			return
		}
		if (!lectureId) return

		// Save access settings locally (backend не поддерживает пароль/тип доступа)
		localStorage.setItem(`lecture_access_${lectureId}`, JSON.stringify({
			accessType, password, duration, allowQuestions
		}))

		try {
			setSaving(true)
			await updateLecture(parseInt(lectureId), {
				name: lectureName.trim(),
				accessType: accessType.toUpperCase(),
				password: accessType === 'password' ? password.trim() : ''
			})
			toast.success('Настройки сохранены')
		} catch (e) {
			toast.error('Ошибка при сохранении')
		} finally {
			setSaving(false)
		}
	}

	const handleStart = async () => {
		if (!lectureName.trim()) {
			toast.error('Сначала заполните название')
			return
		}
		if (accessType === 'password' && !password.trim()) {
			toast.error('Задайте пароль для лекции')
			return
		}
		if (!lectureId) {
			toast.error('ID лекции не найден')
			return
		}

		try {
			await startLecture(parseInt(lectureId))
			toast.success('Лекция запущена!')
			navigate(`/live/${lectureId}`)
		} catch (error) {
			console.error('Failed to start lecture:', error)
			toast.error('Ошибка при запуске лекции')
		}
	}

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text).then(() => toast.success('Скопировано'))
	}

	const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
		<button
			onClick={onChange}
			className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-orange-500' : 'bg-neutral-300'}`}
		>
			<div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${value ? 'left-5' : 'left-1'}`} />
		</button>
	)

	if (loadingLecture) {
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
					<h1 className="mb-1">Настройка лекции</h1>
					<p className="text-sm text-neutral-500">Настройте параметры перед запуском</p>
				</div>
				<div className="flex gap-2">
					<button
						onClick={handleSave}
						disabled={saving}
						className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm disabled:opacity-50"
					>
						{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
						Сохранить
					</button>
					<button
						onClick={handleStart}
						className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
					>
						<Play className="w-4 h-4" /> Начать лекцию
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
				{/* Left */}
				<div className="space-y-6">
					<div className="bg-white rounded-xl p-5 border border-neutral-200">
						<h3 className="text-sm mb-4">Данные лекции</h3>
						<div className="mb-4">
							<label className="block text-sm mb-1.5">Название</label>
							<input
								type="text"
								value={lectureName}
								onChange={e => setLectureName(e.target.value)}
								className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
							/>
						</div>
						<div className="mb-4">
							<label className="block text-sm mb-1.5">Описание</label>
							<textarea
								value={description}
								onChange={e => setDescription(e.target.value)}
								rows={3}
								placeholder="Краткое описание темы..."
								className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
							/>
						</div>
					</div>

					{/* Real slide previews */}
					{slidePreviews.length > 0 && (
						<div className="bg-white rounded-xl p-5 border border-neutral-200">
							<h3 className="text-sm mb-4">Слайды ({slidePreviews.length})</h3>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								{slidePreviews.slice(0, 8).map(s => (
									<div key={s.index} className="aspect-video bg-neutral-100 rounded-lg overflow-hidden">
										<img
											src={s.imageUrl}
											alt={`Слайд ${s.index}`}
											className="w-full h-full object-cover"
										/>
									</div>
								))}
							</div>
							{slidePreviews.length > 8 && (
								<p className="text-xs text-neutral-500 mt-2">и ещё {slidePreviews.length - 8} слайдов...</p>
							)}
						</div>
					)}

					{/* Access & QR */}
					<div className="bg-white rounded-xl p-5 border border-neutral-200">
						<h3 className="text-sm mb-4">Доступ к лекции</h3>
						<div className="space-y-3 mb-4">
							{[
								{ value: 'open' as const, label: 'Открытый доступ', desc: 'Любой студент по ссылке', icon: Globe },
								{ value: 'password' as const, label: 'Защита паролем', desc: 'Студенты вводят пароль при подключении', icon: Lock },
								{ value: 'invitation' as const, label: 'Только по приглашению', desc: 'Только по QR-коду или прямой ссылке', icon: Mail }
							].map(opt => (
								<label
									key={opt.value}
									className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
										accessType === opt.value ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 hover:border-neutral-300'
									}`}
								>
									<input
										type="radio"
										name="access"
										value={opt.value}
										checked={accessType === opt.value}
										onChange={() => setAccessType(opt.value)}
										className="w-4 h-4 accent-orange-500 mt-0.5"
									/>
									<div className="flex-1">
										<div className="flex items-center gap-2 text-sm">
											<opt.icon className="w-4 h-4 text-neutral-500" /> {opt.label}
										</div>
										<div className="text-xs text-neutral-500 mt-0.5">{opt.desc}</div>
									</div>
								</label>
							))}
						</div>

						{accessType === 'password' && (
							<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
								<label className="block text-sm mb-1.5">Пароль для подключения</label>
								<div className="flex gap-2">
									<div className="relative flex-1">
										<input
											type={showPassword ? 'text' : 'password'}
											value={password}
											onChange={e => setPassword(e.target.value)}
											className="w-full px-4 py-2.5 pr-10 bg-white border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
										/>
										<button
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
										>
											{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
										</button>
									</div>
									<button
										onClick={() => copyToClipboard(password)}
										className="px-3 py-2 border border-orange-300 rounded-lg hover:bg-orange-100 text-sm flex items-center gap-1"
									>
										<Copy className="w-3.5 h-3.5" /> Копировать
									</button>
								</div>
								{password && (
									<div className="mt-2 flex items-center gap-2 text-sm">
										<span className="text-neutral-600">Пароль:</span>
										<code className="bg-white px-2 py-0.5 rounded border border-orange-200 text-orange-700">{password}</code>
									</div>
								)}
							</div>
						)}

						{accessType === 'invitation' && (
							<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
								<div>
									<label className="block text-sm mb-1.5">Команда для студентов (Telegram)</label>
									<div className="flex gap-2">
										<code className="flex-1 px-3 py-2 bg-white border border-orange-300 rounded-lg text-sm text-orange-800 font-mono">
											{joinCommand}
										</code>
										<button
											onClick={() => copyToClipboard(joinCommand)}
											className="px-3 py-2 border border-orange-300 rounded-lg hover:bg-orange-100 text-sm flex items-center gap-1"
										>
											<Copy className="w-3.5 h-3.5" />
										</button>
									</div>
									<p className="text-xs text-neutral-500 mt-1">Студент отправляет эту команду боту <span className="font-medium">@{BOT_USERNAME}</span></p>
								</div>
								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="text-sm">QR-код → открывает Telegram-бота</label>
										<button
											onClick={() => setShowQR(!showQR)}
											className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
										>
											<QrCode className="w-4 h-4" /> {showQR ? 'Скрыть' : 'Показать QR'}
										</button>
									</div>
									{showQR && (
										<div className="flex justify-center p-4 bg-white rounded-lg border border-orange-200">
											<img src={qrUrl} alt="QR Code" className="w-48 h-48" />
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Right */}
				<div className="space-y-6">
					<div className="bg-white rounded-xl p-5 border border-neutral-200">
						<h3 className="text-sm mb-4">Параметры</h3>
						{slidePreviews.length > 0 && (
							<div className="mb-4">
								<label className="block text-sm mb-1.5">Начать со слайда</label>
								<select
									value={startSlide}
									onChange={e => setStartSlide(e.target.value)}
									className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
								>
									{slidePreviews.map(s => (
										<option key={s.index} value={s.index}>Слайд {s.index}</option>
									))}
								</select>
							</div>
						)}
						<div className="mb-4">
							<label className="block text-sm mb-1.5">Длительность (мин)</label>
							<input
								type="number"
								value={duration}
								onChange={e => setDuration(e.target.value)}
								className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
							/>
						</div>
						<div className="space-y-3 border-t border-neutral-200 pt-4">
							<div className="flex items-center justify-between">
								<span className="text-sm">Разрешить вопросы</span>
								<Toggle value={allowQuestions} onChange={() => setAllowQuestions(!allowQuestions)} />
							</div>
						</div>
					</div>

					{accessType === 'password' && password && (
						<div className="bg-orange-500 text-white rounded-xl p-5">
							<div className="flex items-center gap-2 mb-2">
								<Lock className="w-4 h-4" />
								<span className="text-sm">Пароль для студентов</span>
							</div>
							<div className="text-2xl tracking-wider mb-1">{password}</div>
							<p className="text-orange-100 text-xs">Покажите студентам при подключении</p>
						</div>
					)}

					{accessType === 'invitation' && (
						<div className="bg-orange-500 text-white rounded-xl p-5 text-center">
							<QrCode className="w-5 h-5 mx-auto mb-2" />
							<p className="text-sm mb-2">QR → откроет бота в Telegram</p>
							<div className="bg-white rounded-lg p-3 inline-block mb-2">
								<img src={qrUrl} alt="QR" className="w-32 h-32" />
							</div>
							<p className="text-orange-100 text-xs">Выведите на проектор для студентов</p>
							<div className="mt-3 bg-orange-600 rounded-lg px-3 py-2">
								<p className="text-orange-200 text-xs mb-1">Или команда боту:</p>
								<code className="text-white text-sm font-mono">{joinCommand}</code>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}