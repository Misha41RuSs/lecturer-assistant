# Content Management Service

Сервис управления учебными материалами. Отвечает за загрузку презентаций (PDF/PPTX), парсинг слайдов, хранение медиа-файлов и выдачу контента. Выступает в роли "источника правды" для файлов. Порт: **8081**.

## Реализованный функционал

### Поддерживаемые форматы
- **PDF** — разбиение на отдельные слайды (Apache PDFBox)
- **PPTX** — преобразование в изображения (Apache POI)

### Операции
- Загрузка презентации с автоматическим парсингом
- Присоединение дополнительных медиа-файлов (изображения, видео) к слайдам
- Управление последовательностью слайдов
- Выдача слайдов по ID или по индексу в последовательности

## API

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/presentations/upload` | Загрузить PDF/PPTX файл (multipart: `file`) |
| `GET` | `/slides/{slideId}` | Получить слайд (PNG-изображение) |
| `POST` | `/slides/{slideId}/media` | Прикрепить медиа-файл к слайду (multipart: `file`) |
| `GET` | `/slide-sequences/{sequenceId}` | Получить информацию о последовательности |
| `GET` | `/slide-sequences/{sequenceId}/slide/{slideIndex}` | Получить слайд по индексу в последовательности |
| `PUT` | `/slide-sequences/{sequenceId}` | Обновить порядок слайдов (body: массив UUID слайдов) |

### Ответ загрузки (`POST /presentations/upload`)
```json
{
  "sequenceId": "550e8400-e29b-41d4-a716-446655440000",
  "slideCount": 15
}
```

## База данных
`content_db` (PostgreSQL). Таблицы `slides` и `slide_sequences` создаются автоматически через Hibernate.

## Запуск
Сборка:
```bash
mvn clean package -DskipTests
```
Запуск в Docker:
```bash
docker compose up -d --build content-service
```
