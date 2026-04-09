import {
	Copy,
	Eye,
	EyeOff,
	Globe,
	Lock,
	Mail,
	Play,
	QrCode,
	Save
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { startLecture } from '../app/api/lecture.api'

export function LectureSettingsPage() {
	const navigate = useNavigate()
	const { lectureId } = useParams<{ lectureId: string }>()
	const [lectureName, setLectureName] = useState('Введение в алгоритмы')
	const [description, setDescription] = useState(
		'Обзор основных алгоритмов сортировки, поиска и анализа сложности.'
	)
	const [startSlide, setStartSlide] = useState('1')
	const [accessType, setAccessType] = useState<
		'open' | 'password' | 'invitation'
	>('open')
	const [password, setPassword] = useState('algo2026')
	const [showPassword, setShowPassword] = useState(false)
	const [duration, setDuration] = useState('90')
	const [allowQuestions, setAllowQuestions] = useState(true)
	const [showQR, setShowQR] = useState(false)

	const slidePreview = [
		{ id: 1, title: 'Введение', color: 'from-neutral-800 to-neutral-900' },
		{ id: 2, title: 'Алгоритм анализа', color: 'from-blue-900 to-blue-950' },
		{ id: 3, title: 'Нотация Big-O', color: 'from-blue-900 to-blue-950' },
		{ id: 4, title: 'Итоги и вопросы', color: 'from-purple-800 to-purple-900' }
	]

	const lectureUrl = `https://lectureapp.ru/join/abc123`
	const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lectureUrl)}`

	const handleSave = () => {
		if (!lectureName.trim()) {
			toast.error('Введите название лекции')
			return
		}
		if (accessType === 'password' && !password.trim()) {
			toast.error('Введите пароль')
			return
		}
		toast.success('Настройки сохранены')
		navigate('/my-lectures')
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

	const Toggle = ({
		value,
		onChange
	}: {
		value: boolean
		onChange: () => void
	}) => (
		<button
			onClick={onChange}
			className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-orange-500' : 'bg-neutral-300'}`}
		>
			<div
				className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${value ? 'left-5' : 'left-1'}`}
			/>
		</button>
	)

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="mb-1">Настройка лекции</h1>
					<p className="text-sm text-neutral-500">
						Настройте параметры перед запуском
					</p>
				</div>
				<div className="flex gap-2">
					<button
						onClick={handleSave}
						className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm"
					>
						<Save className="w-4 h-4" /> Сохранить
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
								className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
							/>
						</div>
					</div>

					{/* Slide preview */}
					<div className="bg-white rounded-xl p-5 border border-neutral-200">
						<h3 className="text-sm mb-4">Слайды ({slidePreview.length})</h3>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							{slidePreview.map(s => (
								<div
									key={s.id}
									className={`aspect-video bg-gradient-to-br ${s.color} rounded-lg p-3 flex flex-col justify-end`}
								>
									<div className="text-white text-xs">{s.title}</div>
								</div>
							))}
						</div>
					</div>

					{/* Access & QR */}
					<div className="bg-white rounded-xl p-5 border border-neutral-200">
						<h3 className="text-sm mb-4">Доступ к лекции</h3>
						<div className="space-y-3 mb-4">
							{[
								{
									value: 'open' as const,
									label: 'Открытый доступ',
									desc: 'Любой студент по ссылке',
									icon: Globe
								},
								{
									value: 'password' as const,
									label: 'Защита паролем',
									desc: 'Студенты вводят пароль при подключении',
									icon: Lock
								},
								{
									value: 'invitation' as const,
									label: 'Только по приглашению',
									desc: 'Только по QR-коду или прямой ссылке',
									icon: Mail
								}
							].map(opt => (
								<label
									key={opt.value}
									className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
										accessType === opt.value
											? 'border-orange-500 bg-orange-50'
											: 'border-neutral-200 hover:border-neutral-300'
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
											<opt.icon className="w-4 h-4 text-neutral-500" />{' '}
											{opt.label}
										</div>
										<div className="text-xs text-neutral-500 mt-0.5">
											{opt.desc}
										</div>
									</div>
								</label>
							))}
						</div>

						{/* Password field - always visible when password mode */}
						{accessType === 'password' && (
							<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
								<label className="block text-sm mb-1.5">
									Пароль для подключения
								</label>
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
											{showPassword ? (
												<EyeOff className="w-4 h-4" />
											) : (
												<Eye className="w-4 h-4" />
											)}
										</button>
									</div>
									<button
										onClick={() => copyToClipboard(password)}
										className="px-3 py-2 border border-orange-300 rounded-lg hover:bg-orange-100 text-sm flex items-center gap-1"
									>
										<Copy className="w-3.5 h-3.5" /> Копировать
									</button>
								</div>
								<div className="mt-2 flex items-center gap-2 text-sm">
									<span className="text-neutral-600">Пароль:</span>
									<code className="bg-white px-2 py-0.5 rounded border border-orange-200 text-orange-700">
										{password}
									</code>
								</div>
							</div>
						)}

						{/* QR for invitation mode */}
						{accessType === 'invitation' && (
							<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
								<div className="flex items-center justify-between mb-3">
									<label className="text-sm">Ссылка для подключения</label>
									<button
										onClick={() => setShowQR(!showQR)}
										className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
									>
										<QrCode className="w-4 h-4" />{' '}
										{showQR ? 'Скрыть QR' : 'Показать QR'}
									</button>
								</div>
								<div className="flex gap-2 mb-3">
									<input
										type="text"
										value={lectureUrl}
										readOnly
										className="flex-1 px-3 py-2 bg-white border border-orange-300 rounded-lg text-sm"
									/>
									<button
										onClick={() => copyToClipboard(lectureUrl)}
										className="px-3 py-2 border border-orange-300 rounded-lg hover:bg-orange-100 text-sm flex items-center gap-1"
									>
										<Copy className="w-3.5 h-3.5" />
									</button>
								</div>
								{showQR && (
									<div className="flex justify-center p-4 bg-white rounded-lg border border-orange-200">
										<img
											src={qrUrl}
											alt="QR Code"
											className="w-48 h-48"
										/>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Right */}
				<div className="space-y-6">
					<div className="bg-white rounded-xl p-5 border border-neutral-200">
						<h3 className="text-sm mb-4">Параметры</h3>
						<div className="mb-4">
							<label className="block text-sm mb-1.5">Начать со слайда</label>
							<select
								value={startSlide}
								onChange={e => setStartSlide(e.target.value)}
								className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
							>
								{slidePreview.map(s => (
									<option
										key={s.id}
										value={s.id}
									>
										Слайд {s.id} — {s.title}
									</option>
								))}
							</select>
						</div>
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
								<Toggle
									value={allowQuestions}
									onChange={() => setAllowQuestions(!allowQuestions)}
								/>
							</div>
						</div>
					</div>

					{/* Quick access info */}
					{accessType === 'password' && (
						<div className="bg-orange-500 text-white rounded-xl p-5">
							<div className="flex items-center gap-2 mb-2">
								<Lock className="w-4 h-4" />
								<span className="text-sm">Пароль для студентов</span>
							</div>
							<div className="text-2xl tracking-wider mb-1">{password}</div>
							<p className="text-orange-100 text-xs">
								Покажите студентам при подключении
							</p>
						</div>
					)}

					{accessType === 'invitation' && (
						<div className="bg-orange-500 text-white rounded-xl p-5 text-center">
							<QrCode className="w-5 h-5 mx-auto mb-2" />
							<p className="text-sm mb-3">QR-код для подключения</p>
							<div className="bg-white rounded-lg p-3 inline-block">
								<img
									src={qrUrl}
									alt="QR"
									className="w-32 h-32"
								/>
							</div>
							<p className="text-orange-100 text-xs mt-2">
								Выведите на проектор для студентов
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
