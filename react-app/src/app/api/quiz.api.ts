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