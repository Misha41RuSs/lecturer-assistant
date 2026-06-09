package ru.university.lecturebroadcasting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.lecturebroadcasting.entity.PostLectureResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostLectureResponseRepository extends JpaRepository<PostLectureResponse, UUID> {
    List<PostLectureResponse> findByLecture_Id(Long lectureId);
    Optional<PostLectureResponse> findByLecture_IdAndChatId(Long lectureId, Long chatId);
}
