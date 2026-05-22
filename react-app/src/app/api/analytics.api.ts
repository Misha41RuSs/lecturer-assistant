import { apiFetch } from "./client";

// Системные события (смена слайда, старт/стоп лекции)
export function sendLectureEvent(event: {
  lectureId: string;
  actionType: string;
  payload?: string;
}) {
  return apiFetch("/analytics/events/lecture", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

// Пользовательские события (студент присоединился, ответил и т.д.)
export function sendUserEvent(event: {
  lectureId: string;
  userId?: string;
  actionType: string;
  payload?: string;
}) {
  return apiFetch("/analytics/events/user", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

// Агрегированные метрики для лекции
export function getLectureAggregations(lectureId: string) {
  return apiFetch(`/analytics/lectures/${lectureId}/aggregations`);
}

// Реал-тайм дашборд: studentsJoined, slideChanges, eventsByType, slideActivity
export function getLectureDashboard(lectureId: string) {
  return apiFetch(`/analytics/lectures/${lectureId}/dashboard`);
}

// Итоговый отчёт после завершения лекции
export function getLectureReport(lectureId: string) {
  return apiFetch(`/analytics/lectures/${lectureId}/report`);
}

export function getSlideRequestStats(lectureId: string) {
    return apiFetch(`/analytics/lectures/${lectureId}/slide-request-stats`);
}

// xAPI события для сбора метрик понятности лекции
export function sendXapiSlideShown(lectureId: number, slideId: number) {
  return apiFetch("/xapi/events", {
    method: "POST",
    body: JSON.stringify({
      verb: "slide_shown",
      lectureId,
      slideId,
    }),
  }).catch(() => {}); // Игнорируем ошибки
}

export function sendXapiRating(lectureId: number, slideId: number, chatId: number, rating: number) {
  return apiFetch("/xapi/events", {
    method: "POST",
    body: JSON.stringify({
      verb: "rated",
      lectureId,
      slideId,
      chatId,
      rating,
    }),
  }).catch(() => {});
}

export function sendXapiQuestion(lectureId: number, slideId: number, chatId: number, questionText: string) {
  return apiFetch("/xapi/events", {
    method: "POST",
    body: JSON.stringify({
      verb: "asked",
      lectureId,
      slideId,
      chatId,
      questionText,
    }),
  }).catch(() => {});
}