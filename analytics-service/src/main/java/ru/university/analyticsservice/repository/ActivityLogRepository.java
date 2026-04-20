package ru.university.analyticsservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.analyticsservice.entity.ActivityLog;

import java.util.List;
import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    List<ActivityLog> findByLectureIdOrderByTimestampAsc(Long lectureId);
    List<ActivityLog> findByLectureIdAndActionType(Long lectureId, String actionType);
    long countByLectureId(Long lectureId);
}