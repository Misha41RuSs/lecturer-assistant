# Описание микросервисов системы «Цифровой ассистент лектора»

Архитектура состоит из 4 микросервисов + API Gateway. Все сервисы имеют изолированные базы данных. Единственная точка входа — **AdminGateway** на порту `8080`.

> **Важно:** `lecture_id` везде имеет тип `Long` (не UUID).

---

## API Gateway (AdminGateway) — порт 8080

Маршрутизация запросов:

| Паттерн | Назначение |
|---------|-----------|
| `/api/exams/**` | Lecture Broadcasting Service (запуск тестов) |
| `/slides/*/questions`, `/slides/*/ratings` | Quiz Service |
| `/lectures/*/questions`, `/lectures/*/exams` | Quiz Service |
| `/api/content/**`, `/presentations/**`, `/slides/**`, `/slide-sequences/**` | Content Service |
| `/lectures/**`, `/ws/broadcasting/**` | Lecture Broadcasting Service |
| `/quizzes/**`, `/questions/**`, `/exams/**`, `/answers/**` | Quiz Service |
| `/analytics/**` | Analytics Service |

---

## 1. Content Management Service — порт 8081

Загрузка, хранение и выдача слайдов презентации.

### API
| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/presentations/upload` | Загрузить PDF/PPTX, создаёт слайды и SlideSequence |
| `GET` | `/slides/{id}` | Получить слайд |
| `GET` | `/slide-sequences/{id}` | Получить последовательность слайдов |
| `PUT` | `/slide-sequences/{id}` | Обновить порядок слайдов |

---

## 2. Lecture Broadcasting Service — порт 8082

Жизненный цикл лекции, Telegram-бот, рассылка студентам.

### Модель данных
- **Lecture:** `id` (Long), `name`, `status` (CREATED/ACTIVE/FINISHED), `currentSlide`, `accessType`, `password`, `sequenceId`
- **Student:** `id`, `chatId` (Telegram), связь с Lecture

### API
| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/lectures` | Создать лекцию |
| `GET` | `/lectures` | Список лекций |
| `GET` | `/lectures/{id}` | Получить лекцию |
| `PUT` | `/lectures/{id}` | Обновить название/пароль |
| `POST` | `/lectures/{id}/start` | Запустить лекцию |
| `POST` | `/lectures/{id}/stop` | Остановить лекцию |
| `PUT` | `/lectures/{id}/current-slide` | Сменить слайд (рассылает картинку студентам) |
| `GET` | `/lectures/{id}/students` | Список подключённых (chatId) |
| `POST` | `/lectures/{id}/broadcast-message` | Отправить текст всем студентам |
| `POST` | `/lectures/{id}/broadcast-image` | Отправить изображение всем студентам |
| `GET` | `/lectures/{id}/student-questions` | Вопросы студентов без ответа |
| `PUT` | `/lectures/{id}/student-questions/{qId}/private-reply` | Личный ответ студенту |
| `PUT` | `/lectures/{id}/student-questions/{qId}/broadcast-reply` | Ответ всем студентам |
| `POST` | `/lectures/{id}/kick/{chatId}` | Исключить студента из лекции |
| `POST` | `/lectures/{id}/broadcast-image` | Рассылка PNG-изображения всем студентам |
| `GET` | `/lectures/health/db` | Проверка состояния БД сервиса |
| `POST` | `/api/exams/launch` | Запустить тест для группы (body: `{examId, lectureId}`) |
| `POST` | `/api/exams/launch-to-user` | Запустить тест для одного студента (body: `{examId, chatId}`) |

### Telegram-бот команды
- `/join <название>` — подключиться к лекции
- `/join <название> <пароль>` — подключиться с паролем
- `/question <текст>` — задать вопрос лектору

---

## 3. Quiz Service — порт 8083

Тесты, опросы удовлетворённости, импорт/экспорт GIFT.

### Модель данных
- **Exam:** `id` (UUID), `lectureId` (Long), `title`, `status` (DRAFT/ACTIVE/CLOSED), `examType` (EXAM/SURVEY), `totalTimeSec`
- **ExamQuestion:** `id` (UUID), `type` (MULTIPLE/OPEN), `text`, `timeLimitSec`
- **ExamOption:** `id` (UUID), `text`, `correct` (Boolean)
- **ExamSubmission:** `id` (UUID), `chatId` (Long), `startedAt`, `completedAt`
- **ExamAnswer:** `id` (UUID), `selectedOptionId`, `openText`, `score`, `maxScore`

### API
| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/exams` | Создать тест |
| `GET` | `/exams/{id}` | Получить тест с вопросами (включает `correct` для вариантов) |
| `PUT` | `/exams/{id}` | Обновить тест (только DRAFT) |
| `DELETE` | `/exams/{id}` | Удалить тест |
| `GET` | `/lectures/{lectureId}/exams` | Список тестов лекции |
| `POST` | `/exams/{id}/duplicate` | Дублировать как DRAFT |
| `POST` | `/exams/{id}/launch` | DRAFT → ACTIVE |
| `POST` | `/exams/{id}/close` | ACTIVE → CLOSED |
| `POST` | `/exams/import/gift` | Импорт из GIFT-файла (multipart: `file`, query: `lectureId`, `title`) |
| `GET` | `/exams/{id}/export/gift` | Экспорт в GIFT-файл |
| `POST` | `/exams/{id}/submissions` | Начать прохождение (body: `{chatId}`) |
| `POST` | `/exams/{id}/answers` | Ответить на вопрос (query: `chatId`) |
| `GET` | `/exams/{id}/submissions` | Все результаты |
| `PUT` | `/answers/{id}/grade` | Выставить балл (body: `{score}`) |

---

## 4. Analytics Service — порт 8084

Сбор событий и статистика по лекции.

### Модель данных
- **ActivityLog:** `id` (UUID), `lectureId` (Long), `userId` (String), `actionType`, `payload`, `timestamp`

### Типы событий (`actionType`)
- `start_lecture` — начало лекции
- `end_lecture` — конец лекции
- `slide_changed` — смена слайда (payload: `{"slideNumber": N}`)
- `student_joined` — студент подключился (userId = chatId)

### API
| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/analytics/events/lecture` | Принять событие |
| `GET` | `/analytics/lectures/{lectureId}/dashboard` | Дашборд (студенты, смены слайдов) |
| `GET` | `/analytics/lectures/{lectureId}/aggregations` | Агрегации |
| `GET` | `/analytics/lectures/{lectureId}/report` | Итоговый отчёт |

---

## Глобальные связи

- `lecture_id` (Long) — сквозной идентификатор лекции во всех сервисах
- `chatId` (Long) — Telegram ID студента, используется вместо `user_id`
- Сервисы общаются через REST (синхронно) или асинхронно (Analytics)
- Вопросы студентов хранятся in-memory в Lecture Broadcasting Service и не персистируются