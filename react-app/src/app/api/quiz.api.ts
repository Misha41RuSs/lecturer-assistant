import { apiFetch } from "./client";

export function getQuestions(lectureId: number) {
  return apiFetch(`/lectures/${lectureId}/questions`);
}

export function answerQuestion(questionId: number, answer: string) {
  return apiFetch(`/questions/${questionId}/answer`, {
    method: "PUT",
    body: JSON.stringify({ answer }),
  });
}

export function getQuizResults(quizId: number) {
  return apiFetch(`/quizzes/${quizId}/results`);
}