// Заменяем импорт:
import { createHashRouter } from 'react-router'

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

// Меняем функцию создания роутера:
export const router = createHashRouter([
    {
        path: '/',
        Component: MainLayout,
        children: [
            { index: true, Component: HomePage },
            { path: 'my-lectures', Component: MyLecturesPage },
            { path: 'upload/:lectureId', Component: UploadPresentationPage },
            { path: 'settings/:lectureId', Component: LectureSettingsPage },
            { path: 'tests', Component: TestsPage },
            { path: 'statistics', Component: StatisticsPage },
            { path: 'slide-manager/:lectureId', Component: SlideManagerPage }
        ]
    },
    {
        path: '/live/:lectureId',
        Component: LivePresentationPage
    },
    {
        path: '/projection/:lectureId',
        Component: ProjectionPage
    }
])
