import { BarChart3, BookOpen, ClipboardList, Home, Menu, Radio, X, Gauge } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shared/tooltip'
import { BASE_URL } from '../app/api/client'

export function MainLayout() {
	const location = useLocation()
	const navigate = useNavigate()
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [activeLectureId, setActiveLectureId] = useState<string | null>(
		() => localStorage.getItem('active_lecture_id')
	)

	useEffect(() => {
		const handler = (e: StorageEvent) => {
			if (e.key === 'active_lecture_id') {
				setActiveLectureId(e.newValue)
			}
		}
		window.addEventListener('storage', handler)
		return () => window.removeEventListener('storage', handler)
	}, [])

	const handleOpenGrafana = () => {
		let url = 'http://localhost:3000'
		try {
			const base = new URL(BASE_URL)
			url = `${base.protocol}//${base.hostname}:3000`
		} catch (e) {
			console.error('Failed to parse BASE_URL for Grafana:', e)
		}

		if (window.electronAPI?.openExternal) {
			window.electronAPI.openExternal(url).catch(e => {
				console.error('Failed to open external link in Electron:', e)
			})
		} else {
			window.open(url, '_blank')
		}
	}

	const navItems = [
		{ path: '/', icon: Home, label: 'Главная' },
		{ path: '/my-lectures', icon: BookOpen, label: 'Мои лекции' },
		{ path: '/tests', icon: ClipboardList, label: 'Тесты' },
		{ path: '/statistics', icon: BarChart3, label: 'Статистика' }
	]

	const isActive = (path: string) => {
		if (path === '/') return location.pathname === '/'
		return location.pathname.startsWith(path)
	}

	return (
		<div className="flex h-screen bg-neutral-100">
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-black/40 z-40 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<aside
				className={`fixed lg:static z-50 h-full w-[220px] bg-white border-r border-neutral-200 flex flex-col transition-transform duration-200 ${
					sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
				}`}
			>
				<div className="p-5 border-b border-neutral-200 flex items-center justify-between">
					<Link
						to="/"
						className="text-lg flex items-center gap-2"
					>
						<span className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs">
							L
						</span>
						LectureApp
					</Link>
					<button
						className="lg:hidden"
						onClick={() => setSidebarOpen(false)}
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{activeLectureId && (
					<div className="px-3 pt-3">
						<button
							onClick={() => {
								setSidebarOpen(false)
								navigate(`/live/${activeLectureId}`)
							}}
							className="w-full flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-100 transition-colors"
						>
							<Radio className="w-4 h-4 flex-shrink-0 animate-pulse" />
							<span className="truncate font-medium">Вернуться в лекцию</span>
						</button>
					</div>
				)}

				<nav className="flex-1 p-3">
					{navItems.map(item => {
						const Icon = item.icon
						const active = isActive(item.path)
						return (
							<Tooltip key={item.path}>
								<TooltipTrigger asChild>
									<Link
										to={item.path}
										onClick={() => setSidebarOpen(false)}
										className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-0.5 transition-colors text-sm ${
											active
												? 'bg-orange-50 text-orange-600 border border-orange-200'
												: 'text-neutral-600 hover:bg-neutral-100'
										}`}
									>
										<Icon className="w-4 h-4" />
										<span>{item.label}</span>
									</Link>
								</TooltipTrigger>
								<TooltipContent>
									<p>
										{item.label === 'Главная' && 'Главная страница с лекциями'}
										{item.label === 'Мои лекции' && 'Управление лекциями'}
										{item.label === 'Тесты' && 'Создание и управление тестами'}
										{item.label === 'Статистика' &&
											'Статистика по лекциям и тестам'}
									</p>
								</TooltipContent>
							</Tooltip>
						)
					})}
				</nav>

				<div className="p-3 border-t border-neutral-200">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								onClick={handleOpenGrafana}
								className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors text-sm font-normal cursor-pointer"
							>
								<Gauge className="w-4 h-4 text-neutral-500" />
								<span>Мониторинг</span>
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Открыть дашборды Grafana в браузере</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</aside>

			<div className="flex-1 flex flex-col min-w-0">
				<div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-neutral-200">
					<button onClick={() => setSidebarOpen(true)}>
						<Menu className="w-5 h-5" />
					</button>
					<span className="text-sm">LectureApp</span>
				</div>
				<main className="flex-1 overflow-auto">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
