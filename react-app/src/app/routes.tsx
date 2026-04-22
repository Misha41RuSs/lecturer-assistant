import { createBrowserRouter } from 'react-router'
import { MainLayout } from '../features/MainLayout'
import { HomePage } from '../pages/HomePage'
import { LectureSettingsPage } from '../pages/LectureSettingsPage'
import { LivePresentationPage } from '../pages/LivePresentationPage'
import { MyLecturesPage } from '../pages/MyLecturesPage'
import { ProjectionPage } from '../pages/ProjectionPage'
import { SlideManagerPage } from '../pages/SlideManagerPage'
import { StatisticsPage } from '../pages/StatisticsPage'
import { TestsPage } from '../pages/TestsPage'
import { UploadPresentationPage } from '../pages/UploadPresentationPage'

// Error boundary component
const ErrorBoundary = () => (
	<div
		style={{ padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}
	>
		<h2>Something went wrong!</h2>
		<p>Please check the console for more details.</p>
	</div>
)

// 404 Not Found component
const NotFound = () => (
	<div
		style={{ padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}
	>
		<h2>404 - Page Not Found</h2>
		<p>The page you're looking for doesn't exist.</p>
	</div>
)

export const router = createBrowserRouter(
	[
		{
			path: '/',
			Component: MainLayout,
			errorElement: <ErrorBoundary />,
			children: [
				{ index: true, Component: HomePage },
				{ path: 'my-lectures', Component: MyLecturesPage },
				{ path: 'upload/:lectureId', Component: UploadPresentationPage },
				{ path: 'settings/:lectureId', Component: LectureSettingsPage },
				{ path: 'tests', Component: TestsPage },
				{ path: 'statistics', Component: StatisticsPage },
				{ path: 'slide-manager/:lectureId', Component: SlideManagerPage },
				{ path: '*', Component: NotFound }
			]
		},
		{
			path: '/live/:lectureId',
			Component: LivePresentationPage,
			errorElement: <ErrorBoundary />
		},
		{
			path: '/projection/:lectureId',
			Component: ProjectionPage,
			errorElement: <ErrorBoundary />
		},
		{
			path: '*',
			Component: NotFound
		}
	],
	{
		basename: ''
	}
)
