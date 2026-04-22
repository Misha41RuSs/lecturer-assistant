# Quiz Service

Сервис тестирования и опросов. Порт: **8083**.

## Реализованный функционал

### Полноценные тесты (Exam)
- Вопросы типа **MULTIPLE** (один правильный вариант) и **OPEN** (свободный ответ)
- Статусы: `DRAFT` → `ACTIVE` → `CLOSED`
- Ограничение времени на весь тест и/или на каждый вопрос
- Два типа тестов: `EXAM` и `SURVEY` (опрос удовлетворённости)

### API

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/exams` | Создать тест |
| `GET` | `/exams/{id}` | Получить тест с вопросами и вариантами |
| `PUT` | `/exams/{id}` | Обновить тест (только DRAFT) |
| `DELETE` | `/exams/{id}` | Удалить тест |
| `GET` | `/lectures/{lectureId}/exams` | Список тестов лекции |
| `POST` | `/exams/{id}/duplicate` | Дублировать тест как DRAFT |
| `POST` | `/exams/{id}/launch` | Запустить тест (DRAFT → ACTIVE) |
| `POST` | `/exams/{id}/close` | Закрыть тест (ACTIVE → CLOSED) |
| `POST` | `/exams/import/gift` | Импорт из GIFT-файла (multipart, ?lectureId=&title=) |
| `GET` | `/exams/{id}/export/gift` | Экспорт в GIFT-файл |
| `POST` | `/exams/{id}/submissions` | Начать прохождение теста (студент) |
| `POST` | `/exams/{id}/answers` | Ответить на вопрос (?chatId=) |
| `GET` | `/exams/{id}/submissions` | Результаты всех студентов |
| `PUT` | `/answers/{id}/grade` | Выставить балл за открытый ответ |

### Устаревшие endpoint-ы (квизы реального времени)
`POST /quizzes`, `POST /quizzes/{id}/responses`, `GET /quizzes/{id}/results` — реализованы, но не используются основным UI.

## База данных
`quiz_db` (PostgreSQL). Схема создаётся автоматически через Hibernate (`ddl-auto: update`).

## Запуск
```bash
docker compose up -d --build quiz-service
```