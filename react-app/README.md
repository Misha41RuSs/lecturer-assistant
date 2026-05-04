# React Web App — Lecturer Assistant

Веб-интерфейс для преподавателей. Позволяет управлять лекциями, загружать презентации, проводить тесты и опросы студентов.

**Дизайн:** https://www.figma.com/design/CwlaJxUSEa59uAWzOVqY9G/

## Запуск

### Установка зависимостей
```bash
npm install
```

### Разработка
```bash
npm run dev
```
Откроется приложение на `http://localhost:5173` (Vite по умолчанию)

### Сборка для production
```bash
npm run build
```

### Предпросмотр production сборки
```bash
npm run preview
```

## Основные возможности

### 📌 Управление лекциями
- Создание и запуск лекции
- Загрузка PDF/PPTX презентаций
- Навигация по слайдам
- Рассылка сообщений студентам
- Просмотр подключённых студентов

### 📝 Тесты и опросы
- Создание тестов с вопросами типов:
  - MULTIPLE (выбор одного варианта)
  - OPEN (свободный ответ)
- Импорт/экспорт тестов в формате GIFT
- Запуск тестов во время лекции
- Оценка открытых ответов
- Опросы удовлетворённости (SURVEY)

### 📊 Аналитика
- Дашборд с информацией о студентах
- Статистика по тестам
- Отчёты по лекциям

### 💬 Взаимодействие со студентами
- Система вопросов от студентов
- Ответы лектора (личные или всем)
- Telegram-бот для студентов

## Архитектура

```
src/
├── components/     # React компоненты
├── pages/         # Страницы приложения
├── hooks/         # Custom React hooks
├── services/      # API клиенты
├── store/         # State management (если используется)
├── styles/        # CSS/SCSS
└── utils/         # Утилиты и helper функции
```

## API интеграция

Приложение взаимодействует с Backend через API Gateway на `http://localhost:8080`:

```
API Gateway (8080)
  ├── Content Service (8081)
  ├── Lecture Broadcasting Service (8082)
  ├── Quiz Service (8083)
  └── Analytics Service (8084)
```

Основные API endpoints используемые фронтом:
- `/lectures/**` — управление лекциями
- `/slides/**` — работа со слайдами
- `/exams/**` — тесты и опросы
- `/analytics/**` — статистика

## Зависимости

### Основные библиотеки
- **React** — UI фреймворк
- **Vite** — быстрая сборка
- **Axios** или **Fetch API** — HTTP клиент
- **Material-UI** или другой UI фреймворк (см. package.json)

Подробнее: `npm ls`

## Разработка

### Добавление нового компонента
1. Создать файл в `src/components/`
2. Экспортировать из `index.js`
3. Использовать в других компонентах

### Подключение к API
```javascript
// src/services/api.js
import axios from 'axios';

const API_BASE = 'http://localhost:8080';
const api = axios.create({ baseURL: API_BASE });

export const createLecture = (data) => api.post('/lectures', data);
export const getLecture = (id) => api.get(`/lectures/${id}`);
// и так далее...
```

### Тестирование
```bash
npm run test        # Запуск тестов
npm run test:watch  # Режим наблюдения
npm run test:coverage # С покрытием
```

## Переменные окружения

Создайте файл `.env` в корне `react-app`:
```
VITE_API_URL=http://localhost:8080
```

Или используйте для production:
```
VITE_API_URL=https://api.example.com
```

Доступ в коде: `import.meta.env.VITE_API_URL`

## Production деплоймент

1. Собрать приложение:
   ```bash
   npm run build
   ```

2. Результат в папке `dist/` готов к деплойменту на:
   - GitHub Pages
   - Netlify
   - Vercel
   - Nginx/Apache
   - Любой другой static host

3. При деплойменте убедиться, что API Gateway доступен на нужном адресе.
  