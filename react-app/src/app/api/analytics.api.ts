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