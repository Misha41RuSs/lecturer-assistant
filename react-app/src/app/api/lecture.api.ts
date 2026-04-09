import { createLecture, startLecture, updateCurrentSlide } from './client'

export { createLecture, startLecture }

export function changeSlide(lectureId: number, slideId: string) {
	return updateCurrentSlide(lectureId, slideId)
}
