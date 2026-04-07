# Заглушка для Quiz Service

## Описание
Сервис для проведения опросов, тестов и сбора вопросов от слушателей лекции. Отвечает за обратную связь лектору в реальном времени.

## Задачи для разработчика
1. Настроить Spring Boot 3 + Java 21.
2. Подключить `quiz_db` PostgreSQL через Hibernate/Spring Data JPA.
3. Реализовать REST API:
   - `POST /quizzes`
   - `POST /quizzes/{quiz_id}/responses`
   - `GET /quizzes/{quiz_id}/results`
   - `POST /slides/{slide_id}/questions`
   - `GET /lectures/{lecture_id}/questions`
   - `PUT /questions/{question_id}/answer`
4. Обеспечить корректное использование `lecture_id` и `user_id` во всех запросах.
5. (Опционально) Изучить вариант отправки уведомлений лектору через WebSocket о новых вопросах.

## Запуск
Сборка:
```bash
mvn clean package -DskipTests
```
Запуск (порт 8083):
Сервис запускается в рамках `docker-compose up -d --build`.
