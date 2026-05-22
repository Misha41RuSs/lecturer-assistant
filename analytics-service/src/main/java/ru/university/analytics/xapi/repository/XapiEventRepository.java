package ru.university.analytics.xapi.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import ru.university.analytics.xapi.entity.XapiEvent;

import java.util.List;

@Repository
public interface XapiEventRepository extends JpaRepository<XapiEvent, Long> {
    List<XapiEvent> findByLectureId(Long lectureId);

    List<XapiEvent> findByLectureIdAndVerb(Long lectureId, String verb);

    @Query("SELECT DISTINCT e.slideId FROM XapiEvent e WHERE e.lectureId = ?1 AND e.slideId IS NOT NULL")
    List<Long> findDistinctSlideIdsByLectureId(Long lectureId);

    @Query("SELECT DISTINCT e.chatId FROM XapiEvent e WHERE e.lectureId = ?1 AND e.chatId IS NOT NULL")
    List<Long> findDistinctChatIdsByLectureId(Long lectureId);

    @Query("SELECT COUNT(DISTINCT e.chatId) FROM XapiEvent e WHERE e.lectureId = ?1 AND e.verb = 'asked'")
    long countDistinctChatIdsWithQuestions(Long lectureId);
}
