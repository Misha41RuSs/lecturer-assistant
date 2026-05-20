package ru.university.contentservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.contentservice.entity.SlideNote;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SlideNoteRepository extends JpaRepository<SlideNote, Long> {

    /** Все заметки лекции (для выгрузки / экспорта) */
    List<SlideNote> findByLectureId(Long lectureId);

    /** Одна заметка к конкретному слайду конкретной лекции */
    Optional<SlideNote> findByLectureIdAndSlideId(Long lectureId, UUID slideId);
}
