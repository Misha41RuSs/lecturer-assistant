import {
	AlertCircle,
	Copy,
	FileText,
	LayoutGrid,
	List,
	Loader2,
	Plus,
	Search
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import {
	BASE_URL,
	listLectures,
	stopLecture,
	type LectureListItem
} from '../app/api/client'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shared/tooltip'

export function MyLecturesPage() {
	const [search, setSearch] = useState('')
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
	const [lectures, setLectures] = useState<LectureListItem[]>([])
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [stoppingId, setStoppingId] = useState<number | null>(null)

	useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				setLoading(true)
				setLoadError(null)
				const data = await listLectures()
				if (!cancelled) setLectures(data)
			} catch (e) {
				if (!cancelled) {
					setLoadError(e instanceof Error ? e.message : 'Ошибка загрузки')
					setLectures([])
				}
			} finally {
				if (!cancelled) setLoading(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [])

	const filtered = lectures.filter(l =>
		l.name.toLowerCase().includes(search.toLowerCase())
	)

	const copyText = (label: string, text: string) => {
		navigator.clipboard.writeText(text).then(() => toast.success(label))
	}

	const handleStop = async (id: number) => {
		setStoppingId(id)
		try {
			await stopLecture(id)
			setLectures(ls =>
				ls.map(l => (l.id === id ? { ...l, status: 'STOPPED' } : l))
			)
			toast.success('Лекция завершена')
		} catch {
			toast.error('Не удалось завершить лекцию')
		} finally {
			setStoppingId(null)
		}
	}

	const statusLabel = (s: string) => {
		if (s === 'ACTIVE') return 'Live'
		if (s === 'CREATED') return 'Черновик'
		if (s === 'STOPPED') return 'Завершена'
		return s
	}

	const isRunning = (s: string) => s === 'ACTIVE'

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="mb-1">Мои лекции</h1>
					<p className="text-sm text-neutral-500">
						Данные с сервера: id и имя совпадают с базой (для Telegram:{' '}
						<code className="text-xs bg-neutral-100 px-1 rounded">
							/join имя
						</code>{' '}
						или{' '}
						<code className="text-xs bg-neutral-100 px-1 rounded">
							/join id
						</code>
						)
					</p>
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<Link
							to="/upload/new"
							className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 transition-colors self-start sm:self-auto"
						>
							<Plus className="w-4 h-4" /> Создать лекцию
						</Link>
					</TooltipTrigger>
					<TooltipContent>
						<p>Загрузить презентацию и создать новую лекцию</p>
					</TooltipContent>
				</Tooltip>
			</div>

			<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
				<p className="font-medium mb-1">Проверка без фронта</p>
				<p className="text-amber-800/90">
					Откройте в браузере{' '}
					<code className="text-xs bg-white/80 px-1 py-0.5 rounded border border-amber-200">
						{BASE_URL}/lectures
					</code>{' '}
					— там JSON со всеми лекциями из PostgreSQL.
				</p>
			</div>

			{loadError && (
				<div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
					<AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
					<div>
						<p className="font-medium">Не удалось загрузить список</p>
						<p className="text-red-700/90 mt-1">{loadError}</p>
					</div>
				</div>
			)}

			<div className="flex flex-col sm:flex-row gap-3 mb-6">
				<div className="relative flex-1 max-w-sm">
					<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
					<input
						type="text"
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder="Поиск по названию..."
						className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
					/>
				</div>
				<div className="flex border border-neutral-300 rounded-lg overflow-hidden ml-auto">
					<button
						type="button"
						onClick={() => setViewMode('grid')}
						className={`p-2 ${viewMode === 'grid' ? 'bg-neutral-200' : 'bg-white hover:bg-neutral-50'}`}
					>
						<LayoutGrid className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={() => setViewMode('list')}
						className={`p-2 ${viewMode === 'list' ? 'bg-neutral-200' : 'bg-white hover:bg-neutral-50'}`}
					>
						<List className="w-4 h-4" />
					</button>
				</div>
			</div>

			{loading ? (
				<div className="flex flex-col items-center justify-center py-24 text-neutral-500 gap-2">
					<Loader2 className="w-8 h-8 animate-spin text-orange-500" />
					<span className="text-sm">Загрузка лекций из API…</span>
				</div>
			) : viewMode === 'grid' ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
					{filtered.map(l => (
						<div
							key={l.id}
							className="bg-white rounded-xl p-5 border border-neutral-200"
						>
							<div className="flex items-center justify-between mb-2 gap-2">
								<h4
									className="text-sm font-medium truncate pr-2"
									title={l.name}
								>
									{l.name}
								</h4>
								{isRunning(l.status) && (
									<span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex-shrink-0">
										<span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />{' '}
										Live
									</span>
								)}
							</div>
							<div className="flex flex-wrap gap-2 text-xs text-neutral-600 mb-3">
								<span className="inline-flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded">
									id: {l.id}
									<button
										type="button"
										onClick={() => copyText('Id скопирован', String(l.id))}
										className="p-0.5 hover:text-orange-600"
										title="Копировать id для /join"
									>
										<Copy className="w-3 h-3" />
									</button>
								</span>
								<span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200">
									{statusLabel(l.status)}
								</span>
							</div>
							<div className="flex flex-wrap gap-3 text-sm text-neutral-500 mb-4">
								<span className="flex items-center gap-1">
									<FileText className="w-3.5 h-3.5" />
									слайд {l.currentSlide}
								</span>
							</div>
							<div className="flex gap-2 flex-wrap">
								<button
									type="button"
									onClick={() =>
										copyText(
											'Команда для Telegram скопирована',
											`/join ${l.name}`
										)
									}
									className="flex-1 text-center px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-xs"
								>
									Копировать /join
								</button>
								{isRunning(l.status) && (
									<button
										type="button"
										disabled={stoppingId === l.id}
										onClick={() => handleStop(l.id)}
										className="flex-1 text-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs disabled:opacity-60"
									>
										{stoppingId === l.id ? 'Завершение…' : 'Завершить'}
									</button>
								)}
								<Link
									to={`/settings/${l.id}`}
									className="flex-1 text-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
								>
									Настроить
								</Link>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-neutral-200 bg-neutral-50">
									<th className="text-left py-3 px-4 text-sm text-neutral-600">
										Id
									</th>
									<th className="text-left py-3 px-4 text-sm text-neutral-600">
										Название (как в БД)
									</th>
									<th className="text-left py-3 px-4 text-sm text-neutral-600">
										Статус
									</th>
									<th className="py-3 px-4" />
								</tr>
							</thead>
							<tbody>
								{filtered.map(l => (
									<tr
										key={l.id}
										className="border-b border-neutral-100 hover:bg-neutral-50"
									>
										<td className="py-3 px-4 text-sm font-mono">{l.id}</td>
										<td className="py-3 px-4 text-sm">
											<span className="flex items-center gap-2 flex-wrap">
												{l.name}
												{isRunning(l.status) && (
													<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
												)}
											</span>
										</td>
										<td className="py-3 px-4 text-sm text-neutral-600">
											{statusLabel(l.status)}
										</td>
										<td className="py-3 px-4 flex items-center gap-3">
											{isRunning(l.status) && (
												<button
													type="button"
													disabled={stoppingId === l.id}
													onClick={() => handleStop(l.id)}
													className="text-red-600 hover:text-red-700 text-sm disabled:opacity-60"
												>
													{stoppingId === l.id ? 'Завершение…' : 'Завершить'}
												</button>
											)}
											<Link
												to={`/settings/${l.id}`}
												className="text-orange-500 hover:text-orange-600 text-sm"
											>
												Настроить
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{!loading && filtered.length === 0 && !loadError && (
				<div className="text-center py-16 text-neutral-500">
					{lectures.length === 0
						? 'В базе пока нет лекций — создайте через «Загрузку презентации».'
						: 'Ничего не найдено по запросу.'}
				</div>
			)}
		</div>
	)
}
