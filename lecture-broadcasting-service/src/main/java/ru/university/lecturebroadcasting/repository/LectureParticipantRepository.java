package ru.university.lecturebroadcasting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.lecturebroadcasting.entity.LectureParticipant;

import java.util.List;
import java.util.Optional;

public interface LectureParticipantRepository extends JpaRepository<LectureParticipant, Long> {
    List<LectureParticipant> findByLectureId(Long lectureId);
    Optional<LectureParticipant> findByLectureIdAndChatId(Long lectureId, Long chatId);
}