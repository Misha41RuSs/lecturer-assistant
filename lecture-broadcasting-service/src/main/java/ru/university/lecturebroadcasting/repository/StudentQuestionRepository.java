package ru.university.lecturebroadcasting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.lecturebroadcasting.entity.StudentQuestionEntity;

import java.util.List;
import java.util.UUID;

public interface StudentQuestionRepository extends JpaRepository<StudentQuestionEntity, UUID> {
    List<StudentQuestionEntity> findByLecture_Id(Long lectureId);
    List<StudentQuestionEntity> findByLecture_IdAndStatus(Long lectureId, String status);
    void deleteByLecture_Id(Long lectureId);
}
