import { apiFetch } from "./client";

export function getSlide(slideId: number) {
  return apiFetch(`/slides/${slideId}`);
}

export function getSlideSequence(sequenceId: number) {
  return apiFetch(`/slide-sequences/${sequenceId}`);
}