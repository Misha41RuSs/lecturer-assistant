import { apiFetch } from "./client";

export function sendUserEvent(event: any) {
  return apiFetch("/analytics/events/user", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export function getLectureDashboard(lectureId: number) {
  return apiFetch(`/analytics/lectures/${lectureId}/dashboard`);
}