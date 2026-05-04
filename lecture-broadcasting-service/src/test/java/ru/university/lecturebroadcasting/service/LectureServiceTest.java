package ru.university.lecturebroadcasting.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.entity.LectureStatus;
import ru.university.lecturebroadcasting.repository.LectureRepository;
import ru.university.lecturebroadcasting.repository.StudentRepository;
import ru.university.lecturebroadcasting.repository.BannedUserRepository;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LectureServiceTest {

    @Mock
    private LectureRepository lectureRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private BannedUserRepository bannedUserRepository;

    @Mock
    private ContentServiceClient contentServiceClient;

    @Mock
    private AnalyticsServiceClient analyticsServiceClient;

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private LectureService lectureService;

    @Test
    void startLecture_setsStatusActive() {
        Lecture lecture = new Lecture("Алгебра", null);
        when(lectureRepository.findById(1L)).thenReturn(Optional.of(lecture));
        when(lectureRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Lecture result = lectureService.startLecture(1L);

        assertEquals(LectureStatus.ACTIVE, result.getStatus());
    }

    @Test
    void stopLecture_setsStatusStopped() {
        Lecture lecture = new Lecture("Алгебра", null);
        lecture.setStatus(LectureStatus.ACTIVE);
        when(lectureRepository.findById(1L)).thenReturn(Optional.of(lecture));
        when(lectureRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(studentRepository.findByLecture_Id(1L)).thenReturn(List.of());

        var result = lectureService.stopLecture(1L);

        assertEquals(LectureStatus.STOPPED, result.lecture().getStatus());
    }
}