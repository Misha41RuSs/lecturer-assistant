package ru.university.lecturebroadcasting.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.university.lecturebroadcasting.entity.LectureParticipant;
import ru.university.lecturebroadcasting.entity.PaceSignal;
import ru.university.lecturebroadcasting.entity.PostLectureResponse;
import ru.university.lecturebroadcasting.repository.LectureParticipantRepository;
import ru.university.lecturebroadcasting.repository.LectureRepository;
import ru.university.lecturebroadcasting.repository.PostLectureResponseRepository;
import ru.university.lecturebroadcasting.repository.StudentRepository;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostLectureSurveyServiceTest {

    @Mock
    private PostLectureResponseRepository responseRepository;

    @Mock
    private LectureRepository lectureRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private LectureParticipantRepository participantRepository;

    @InjectMocks
    private PostLectureSurveyService service;

    @Test
    void results_keepPersistedParticipantsAfterLectureStopped() {
        Long lectureId = 42L;
        PostLectureResponse response = new PostLectureResponse();
        response.setChatId(100L);
        response.setRating(5);
        response.setPaceSignal(PaceSignal.COMFORTABLE);
        response.setOpenText("понятно");

        when(responseRepository.findByLecture_Id(lectureId)).thenReturn(List.of(response));
        when(studentRepository.findByLecture_Id(lectureId)).thenReturn(List.of());
        when(participantRepository.findByLectureId(lectureId)).thenReturn(List.of(
                new LectureParticipant(lectureId, 100L, "A", null, null),
                new LectureParticipant(lectureId, 101L, "B", null, null),
                new LectureParticipant(lectureId, 102L, "C", null, null)
        ));

        PostLectureSurveyService.Results results = service.results(lectureId);

        assertAll(
                () -> assertEquals(3, results.totalStudents()),
                () -> assertEquals(1, results.responded()),
                () -> assertEquals(5.0, results.avgRating()),
                () -> assertEquals(1L, results.ratingDistribution().get(5)),
                () -> assertEquals(1L, results.paceCounts().get(PaceSignal.COMFORTABLE)),
                () -> assertEquals(List.of("понятно"), results.openTexts())
        );
    }
}
