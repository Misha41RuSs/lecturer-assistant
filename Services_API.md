# Описание микросервисов системы «Цифровой ассистент лектора»

Архитектура состоит из 4 основных микросервисов, взаимодействующих через API Gateway (`AdminGateway`). Все сервисы имеют изолированные базы данных (Database-per-service). Маршрутизация запросов к материалам и потоков событий лекции осуществляется через Gateway.

---

## 1. Сервис управления учебными материалами (Content Management Service)
*Отвечает за загрузку, парсинг, хранение, выдачу и версионирование учебного контента. Инкапсулирует БД «Слайды».*

### Модель данных
* **Slide (Слайд):** * `id` (UUID), `title` (String), `content` (JSON/BLOB), `version` (Integer), `created_at` / `updated_at` (DateTime), `author_id` (UUID).
* **SlideVersion (Версия слайда):** * `id`, `slide_id` (UUID), `version` (Integer), `content` (JSON/BLOB), `created_at`, `updated_at` (DateTime), `change_description` (String).
* **SlideSequence (Последовательность слайдов):** * `id` (UUID), `name` (String), `slides` (Array<UUID>) — список ID слайдов по порядку, `created_at`, `updated_at` (DateTime).
* **CloudStorageLink (Связь с облаком):** * `id`, `slide_id` (UUID), `storage_type` (String), `storage_url` (String), `version` (Integer), `uploaded_at` (DateTime).

### API (Основные функции)
* **Загрузка и парсинг презентации:** `POST /presentations/upload` — (multipart/form-data) Принимает исходный файл (PDF/PPTX), парсит его, автоматически создает записи Slide и генерирует готовую SlideSequence.
* **Загрузка отдельного медиа:** `POST /slides/{slide_id}/media` — Загрузка картинки/файла с компьютера лектора для прикрепления к конкретному слайду.
* **Сборка/Обновление последовательности:** `PUT /slide-sequences/{sequence_id}` — Обновление массива слайдов (перестановка слайдов местами, удаление, добавление).
* **Экспорт презентации:** `GET /slide-sequences/{sequence_id}/export` — Склеивает актуальные версии слайдов (с учетом правок и рисунков лектора) и возвращает итоговый файл (например, PDF).
* **Получение текущей версии слайда:** `GET /slides/{slide_id}` — Возвращает текущую версию слайда.
* **Запись изменений слайда:** `PUT /slides/{slide_id}` — Создает новую версию и обновляет текущую (сохранение правок лектора).
* **Версионирование слайдов:** `GET /slides/{slide_id}/versions` — Возвращает список всех версий слайда.
* **Интеграция с облаком:** `POST /slides/{slide_id}/upload-to-cloud` — Загружает версию в облако и сохраняет ссылку.

---

## 2. Сервис трансляции и уведомлений (Lecture Broadcasting Service)
*Управляет жизненным циклом лекции (старт, стоп, текущий слайд) и подписками слушателей (присутствием). **Содержит встроенного Telegram-бота** для прямого общения со студентами без выделения бота в отдельный микросервис.*

### Модель данных
* **Lecture (Лекция):** * `id` (UUID), `name` (String), `sequence_id` (UUID) — ссылка на набор слайдов, `status` (Enum: CREATED, ACTIVE, FINISHED), `current_slide_id` (UUID), `started_at`, `finished_at` (DateTime).
* **LectureSubscription (Присутствие/Подписка):** * `id` (UUID), `lecture_id` (UUID), `user_id` (UUID/TelegramID), `joined_at` (DateTime).

### API (Основные функции)
* **Создание лекции:** `POST /lectures` — Создает сущность лекции, привязывает SlideSequence.
* **Запуск лекции:** `POST /lectures/{lecture_id}/start` — Меняет статус на ACTIVE.
* **Завершение лекции:** `POST /lectures/{lecture_id}/stop` — Меняет статус на FINISHED, отключает слушателей.
* **Подключение слушателя (Join):** `POST /lectures/{lecture_id}/join` — Вызывается TgBotApp, когда студент пишет `/join lecture_123`. Регистрирует присутствие пользователя и возвращает ему текущий слайд.
* **Смена текущего слайда:** `PUT /lectures/{lecture_id}/current-slide` — Тело: `{ "slide_id": "UUID" }`. Вызывается лектором. Сервис обновляет текущий слайд, инициирует рассылку нового слайда всем подписчикам (через TgBotApp) и асинхронно кидает событие `slide_changed` в Analytics Service.

---

## 3. Сервис тестирования (Quiz Service)
*Отвечает за опросы, тесты, вопросы студентов и сбор обратной связи. Инкапсулирует БД «Тесты».*

### Модель данных
* **Quiz (Тест/Опрос):** `id` (UUID), `lecture_id` (UUID), `title` (String), `created_at` (DateTime).
* **SlideQuestion (Вопрос от студента):** `id` (UUID), `lecture_id` (UUID), `slide_id` (UUID), `user_id` (UUID), `text` (String), **`answer` (String)**, **`is_answered` (Boolean)**.
* **UserResponse (Ответ слушателя):** `id` (UUID), `question_id` (UUID), `user_id` (UUID), `answer` (String).
* **SlideRating (Оценка слайда/материала):** `id` (UUID), `slide_id` (UUID), `user_id` (UUID), `score` (Integer).

### API (Основные функции)
* **Создание теста/задания:** `POST /quizzes` — Распределение тестов для аудитории.
* **Обработка ответа слушателя:** `POST /quizzes/{quiz_id}/responses` — Сбор ответов.
* **Получение результатов теста (Лектором):** `GET /quizzes/{quiz_id}/results` — Агрегированные данные по ответам (статистика, средний балл).
* **Задать вопрос лектору (Студент):** `POST /slides/{slide_id}/questions` — Сохранение вопроса от студента.
* **Получение пула вопросов (Лектор):** `GET /lectures/{lecture_id}/questions` — Получение списка всех вопросов от аудитории по текущей лекции.
* **Ответ на вопрос (Лектор):** `PUT /questions/{question_id}/answer` — Публикация ответа лектором (меняет флаг `is_answered` и сохраняет текст ответа).
* **Оценка материала:** `POST /slides/{slide_id}/ratings` — Сохраняет оценку от слушателя.

---

## 4. Сервис аналитики (Analytics Service)
*Сбор телеметрии, логов, событий лекции и построение графиков активности. Инкапсулирует БД «Активности».*

### Модель данных
* **ActivityLog (Лог активности):** `id` (UUID), `lecture_id` (UUID), `user_id` (UUID - опционально), `action_type` (String) (*start_lecture, slide_changed, student_joined, end_lecture*), `timestamp` (DateTime).
* **SlideRequest (Запрос слайда):** `id` (UUID), `slide_id` (UUID), `user_id` (UUID), `timestamp` (DateTime).
* **LectureSummary (Отчет):** `id` (UUID), `lecture_id` (UUID), `report_data` (JSON).

### API (Основные функции)
* **Сбор системных событий лекции:** `POST /analytics/events/lecture` — Принимает системные эвенты от Lecture Broadcasting Service.
* **Сбор пользовательских событий:** `POST /analytics/events/user` — Логирует фоновые активности слушателей.
* **Обработка данных (Агрегация):** `GET /analytics/lectures/{lecture_id}/aggregations` — Анализирует метрики (вовлеченность, проблемные слайды).
* **Визуализация (Дашборд лектора):** `GET /analytics/lectures/{lecture_id}/dashboard` — Отдает данные для реал-тайм графиков.
* **Генерация отчета:** `GET /analytics/lectures/{lecture_id}/report` — Формирует итоговый отчет после завершения лекции.

---

## Глобальные связи между сущностями (Relations / Soft Links)
Из-за использования паттерна Database-per-service микросервисы обмениваются только UUID (Soft Links):
* **Lecture Broadcasting Service** является источником правды для жизненного цикла лекции. Он хранит `sequence_id` из Content Management Service.
* **Lecture (lecture_id)** выступает сквозным идентификатором. Он связывает логи в **Analytics Service**, опросы/вопросы в **Quiz Service** и подписки в **Lecture Broadcasting Service**.
* **Слайд (slide_id)** связывает текущее состояние лекции, запросы слайдов, конкретные вопросы от студентов и оценки.
* **Пользователь (user_id)** идентифицирует слушателя (например, по Telegram ID) во всех сервисах: при регистрации присутствия, задавании вопросов и решении тестов.