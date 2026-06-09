package ru.university.lecturebroadcasting.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.entity.PaceSignal;
import ru.university.lecturebroadcasting.entity.PostLectureResponse;
import ru.university.lecturebroadcasting.repository.LectureParticipantRepository;
import ru.university.lecturebroadcasting.repository.LectureRepository;
import ru.university.lecturebroadcasting.repository.PostLectureResponseRepository;
import ru.university.lecturebroadcasting.repository.StudentRepository;

import java.util.List;
import java.util.Map;

@Service
public class PostLectureSurveyService {
    private final PostLectureResponseRepository responseRepository;
    private final LectureRepository lectureRepository;
    private final StudentRepository studentRepository;
    private final LectureParticipantRepository participantRepository;

    public PostLectureSurveyService(PostLectureResponseRepository responseRepository,
                                    LectureRepository lectureRepository,
                                    StudentRepository studentRepository,
                                    LectureParticipantRepository participantRepository) {
        this.responseRepository = responseRepository;
        this.lectureRepository = lectureRepository;
        this.studentRepository = studentRepository;
        this.participantRepository = participantRepository;
    }

    @Transactional
    public void saveResponse(Long lectureId, Long chatId, int rating, PaceSignal paceSignal, String openText) {
        if (rating < 1 || rating > 5) throw new IllegalArgumentException("rating must be 1-5");
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + lectureId));
        PostLectureResponse response = responseRepository.findByLecture_IdAndChatId(lectureId, chatId)
                .orElseGet(PostLectureResponse::new);
        response.setLecture(lecture);
        response.setChatId(chatId);
        response.setRating(rating);
        response.setPaceSignal(paceSignal);
        response.setOpenText(openText != null && !openText.isBlank() ? openText.trim() : null);
        responseRepository.save(response);
    }

    @Transactional(readOnly = true)
    public Results results(Long lectureId) {
        List<PostLectureResponse> responses = responseRepository.findByLecture_Id(lectureId);
        int activeStudents = studentRepository.findByLecture_Id(lectureId).size();
        int persistedParticipants = participantRepository.findByLectureId(lectureId).size();
        int totalStudents = Math.max(Math.max(activeStudents, persistedParticipants), responses.size());
        double avgRating = responses.stream()
                .mapToInt(PostLectureResponse::getRating)
                .average()
                .orElse(0);
        Map<Integer, Long> ratingDistribution = responses.stream()
                .collect(java.util.stream.Collectors.groupingBy(PostLectureResponse::getRating, java.util.stream.Collectors.counting()));
        Map<PaceSignal, Long> paceCounts = responses.stream()
                .collect(java.util.stream.Collectors.groupingBy(PostLectureResponse::getPaceSignal, java.util.stream.Collectors.counting()));
        List<String> openTexts = responses.stream()
                .map(PostLectureResponse::getOpenText)
                .filter(text -> text != null && !text.isBlank())
                .toList();
        return new Results(totalStudents, responses.size(), avgRating, ratingDistribution, paceCounts, openTexts);
    }

    public record Results(int totalStudents, int responded, double avgRating,
                          Map<Integer, Long> ratingDistribution,
                          Map<PaceSignal, Long> paceCounts,
                          List<String> openTexts) {}
}
