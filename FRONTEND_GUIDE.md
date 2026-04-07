# Методичка для Frontend

Паттерн архитектуры подразумевает использование **API Gateway**. Это означает, что вам **НЕ НУЖНО** обращаться к каждому микросервису напрямую. Все запросы идут на один единый адрес (Gateway).

---

## 1. Базовый URL

По умолчанию Gateway запускается на порту `8080`.
Базовый URL для всех HTTP-запросов (в разработке):
```javascript
const BASE_URL = 'http://localhost:8080';
```

---

## 2. Маршрутизация запросов (Routes)
Gateway автоматически перенаправляет ваши запросы в нужные микросервисы по префиксу URL:

### 📚 Content Service (Управление материалами)
*Отвечает за загрузку презентаций, выдачу картинок слайдов и версионирование.*

- `POST /presentations/upload` (Form-data, файл) - загрузить презентацию.
- `GET /slides/{slide_id}` - получить данные конкретного слайда.
- `GET /slide-sequences/{sequence_id}` - получить массив слайдов лекции.

### 📡 Lecture Broadcasting Service (Жизненный цикл лекции)
*Управляет началом/завершением лекции и тем, какой слайд сейчас показывается.*

- `POST /lectures` - создать лекцию (прикрепить к ней презентацию).
- `POST /lectures/{lecture_id}/start` - начать лекцию.
- `PUT /lectures/{lecture_id}/current-slide` - переключить слайд (передаете `slide_id`).
- **WebSocket**: `/ws/broadcasting/{lecture_id}` - подключение для получения событий о смене слайда в реальном времени.

### 📝 Quiz Service (Тесты и вопросы от аудитории)
*Все интерактивные элементы, включая вопросы студентов и тесты.*

- `GET /lectures/{lecture_id}/questions` - получить список вопросов заданных аудиторией.
- `PUT /questions/{question_id}/answer` - отметить вопрос отвеченным (и сохранить ответ).
- `GET /quizzes/{quiz_id}/results` - результаты опроса.

### 📊 Analytics Service (Аналитика)
*Сбор данных и построение метрик.*

- `POST /analytics/events/user` - отправка телеметрии о действиях интерфейса лектора.
- `GET /analytics/lectures/{lecture_id}/dashboard` - получить данные для отрисовки графиков активности (Chart.js / Recharts).

---

## 3. Настройки CORS & Специфика Electron
* В Gateway уже включен **Global CORS** (`allowedOrigins: "*"`). Вам не нужно настраивать прокси в `webpack` или `vite`, если вы обращаетесь к `localhost:8080`.
* В Electron, при использовании `fetch` или `axios`, убедитесь, что:
  - Вы делаете запросы с абсолютным URL (`http://localhost:8080/...`), а не относительным.
  - Если приложение упаковано (production), URL Gateway должен браться из переменных окружения Electron (например, через `ipcRenderer` или `process.env`).

## 4. WebSocket и Реал-тайм (для проектора или экрана лектора)
WebSocket нужен **только для вашего frontend-приложения**. Студенты сидят в Telegram и получают картинки от Telegram-бота напрямую от бекенда (вам не нужно думать про студентов).

Для вас (как фронтенда) WebSocket нужен, если вы делаете "Экран проектора", где слайды должны переключаться синхронно с пультом лектора.

Пример работы (Socket.io или нативный WebSocket):
```javascript
const ws = new WebSocket(`ws://localhost:8080/ws/broadcasting/${lectureId}`);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'SLIDE_CHANGED') {
        setCurrentSlide(data.slideId);
    }
};
```

## 5. Загрузка фалов с локальной машины лектора
Поскольку приложение работает на Electron, оно имеет доступ к файловой системе лектора:
При загрузке презентации вам лучше использовать нативные диалоги Electron `dialog.showOpenDialog`, читать файл и отправлять его через `FormData`:

```javascript
const formData = new FormData();
formData.append('pdfFile', new Blob([fileBuffer], { type: 'application/pdf' }));

fetch(`${BASE_URL}/presentations/upload`, {
    method: 'POST',
    body: formData
});
```
