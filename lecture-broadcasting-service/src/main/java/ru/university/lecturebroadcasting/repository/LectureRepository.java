package ru.university.lecturebroadcasting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.entity.LectureStatus;

import java.util.List;
import java.util.Optional;

public interface LectureRepository extends JpaRepository<Lecture, Long> {
    Optional<Lecture> findByNameAndStatusIn(String name, List<LectureStatus> statuses);
}