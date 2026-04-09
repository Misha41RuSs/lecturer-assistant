package ru.university.lecturebroadcasting.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.entity.LectureStatus;
import ru.university.lecturebroadcasting.entity.Student;
import ru.university.lecturebroadcasting.repository.LectureRepository;
import ru.university.lecturebroadcasting.repository.StudentRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LectureService {

    private final LectureRepository lectureRepository;
    private final StudentRepository studentRepository;
    private final ContentServiceClient contentServiceClient;
    private final AnalyticsServiceClient analyticsServiceClient;

    @Transactional
    public Lecture createLecture(String name) {
        Lecture lecture = new Lecture(name);
        return lectureRepository.save(lecture);
    }

    @Transactional
    public Lecture startLecture(Long id) {
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + id));
        lecture.setStatus(LectureStatus.ACTIVE);
        return lectureRepository.save(lecture);
    }

    @Transactional
    public Lecture stopLecture(Long id) {
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + id));
        lecture.setStatus(LectureStatus.STOPPED);
        return lectureRepository.save(lecture);
    }

    @Transactional
    public Student joinLecture(String lectureName, Long chatId) {
        Lecture lecture = lectureRepository
                .findByNameAndStatusIn(lectureName, List.of(LectureStatus.CREATED, LectureStatus.ACTIVE))
                .orElseThrow(() -> new IllegalArgumentException("Active lecture not found: " + lectureName));

        Student student = studentRepository.findByChatId(chatId)
                .orElseGet(() -> new Student(chatId, lecture));
        student.setLecture(lecture);
        return studentRepository.save(student);
    }

    /**
     * Updates current slide, fetches image from content-service,
     * broadcasts to all subscribed students via Telegram bot.
     * Returns (lecture, slideImageBytes) for the caller (bot) to send.
     */
    @Transactional
    public SlideUpdateResult updateCurrentSlide(Long lectureId, int slideNumber) {
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + lectureId));

        lecture.setCurrentSlide(slideNumber);
        lectureRepository.save(lecture);

        byte[] imageBytes = contentServiceClient.getSlideImage(slideNumber);
        List<Long> chatIds = studentRepository.findByLecture(lecture)
                .stream()
                .map(Student::getChatId)
                .toList();

        analyticsServiceClient.sendSlideChangedEvent(lectureId, slideNumber);

        return new SlideUpdateResult(lecture, imageBytes, chatIds);
    }

    public byte[] getSlideImage(int slideNumber) {
        return contentServiceClient.getSlideImage(slideNumber);
    }

    public record SlideUpdateResult(Lecture lecture, byte[] imageBytes, List<Long> chatIds) {}
}