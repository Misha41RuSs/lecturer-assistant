import { apiFetch } from "./client";

// Вопросы студентов во время лекции
export function getQuestions(lectureId: string) {
  return apiFetch(`/lectures/${lectureId}/questions`);
}

export function askQuestion(slideId: string, lectureId: string, userId: number | null, text: string) {
  return apiFetch(`/slides/${slideId}/questions`, {
    method: "POST",
    body: JSON.stringify({
      lectureId,
      ...(userId != null ? { userId: String(userId) } : {}),
      text,
    }),
  });
}

export function answerQuestion(questionId: string, answer: string) {
  return apiFetch(`/questions/${questionId}/answer`, {
    method: "PUT",
    body: JSON.stringify({ answer }),
  });
}

// Квизы (опросы, запускаемые лектором во время лекции)
export function createQuiz(lectureId: string, title: string) {
  return apiFetch("/quizzes", {
    method: "POST",
    body: JSON.stringify({ lectureId, title }),
  });
}

export function addResponse(quizId: string, userId: number | null, answer: string) {
  return apiFetch(`/quizzes/${quizId}/responses`, {
    method: "POST",
    body: JSON.stringify({
      ...(userId != null ? { userId: String(userId) } : {}),
      answer,
    }),
  });
}

export function getQuizResults(quizId: string) {
  return apiFetch(`/quizzes/${quizId}/results`);
}

// Рейтинги слайдов (студент оценивает слайд от 1 до 5)
export function rateSlide(slideId: string, userId: number | null, score: number) {
  return apiFetch(`/slides/${slideId}/ratings`, {
    method: "POST",
    body: JSON.stringify({
      ...(userId != null ? { userId: String(userId) } : {}),
      score: String(score),
    }),
  });
}

export function getSlideRatings(slideId: string) {
  return apiFetch(`/slides/${slideId}/ratings`);
}

// Полноценные тесты (Exam)
export function createExam(dto: {
  lectureId: string;
  title: string;
  totalTimeSec?: number | null;
  examType?: "EXAM" | "SURVEY";
  questions: {
    text: string;
    type: "MULTIPLE" | "OPEN";
    timeLimitSec?: number | null;
    options?: { text: string; correct: boolean }[];
  }[];
}) {
  return apiFetch("/exams", { method: "POST", body: JSON.stringify(dto) });
}

export function getExam(examId: string) {
  return apiFetch(`/exams/${examId}`);
}

export function getExamsByLecture(lectureId: string) {
  return apiFetch(`/lectures/${lectureId}/exams`);
}

export function launchExam(examId: string) {
  return apiFetch(`/exams/${examId}/launch`, { method: "POST" });
}

export function closeExam(examId: string) {
  return apiFetch(`/exams/${examId}/close`, { method: "POST" });
}

export function getExamSubmissions(examId: string) {
  return apiFetch(`/exams/${examId}/submissions`);
}

export function gradeAnswer(answerId: string, score: number) {
  return apiFetch(`/answers/${answerId}/grade`, {
    method: "PUT",
    body: JSON.stringify({ score }),
  });
}

export function updateExam(examId: string, dto: Parameters<typeof createExam>[0]) {
  return apiFetch(`/exams/${examId}`, { method: "PUT", body: JSON.stringify(dto) });
}

export async function deleteExam(examId: string): Promise<void> {
  const { BASE_URL } = await import("./client");
  const res = await fetch(`${BASE_URL}/exams/${examId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export function duplicateExam(examId: string) {
  return apiFetch(`/exams/${examId}/duplicate`, { method: "POST" });
}

export function broadcastExam(examId: string, lectureId: string) {
  return apiFetch(`/api/exams/launch`, {
    method: "POST",
    body: JSON.stringify({ examId, lectureId }),
  });
}

export function sendExamToUser(examId: string, chatId: number) {
  return apiFetch(`/api/exams/launch-to-user`, {
    method: "POST",
    body: JSON.stringify({ examId, chatId: String(chatId) }),
  });
}

export async function importGift(lectureId: string, title: string, file: File): Promise<any> {
  const { BASE_URL } = await import("./client");
  const formData = new FormData();
  formData.append("file", file);
  const url = `${BASE_URL}/exams/import/gift?lectureId=${encodeURIComponent(lectureId)}&title=${encodeURIComponent(title)}`;
  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Import failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function exportGift(examId: string, examTitle: string): Promise<void> {
  const { BASE_URL } = await import("./client");
  const res = await fetch(`${BASE_URL}/exams/${examId}/export/gift`);
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${examTitle}.gift`;
  a.click();
  URL.revokeObjectURL(url);
}