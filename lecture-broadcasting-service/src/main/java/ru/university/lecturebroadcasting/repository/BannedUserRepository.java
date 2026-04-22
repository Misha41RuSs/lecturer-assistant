package ru.university.lecturebroadcasting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.lecturebroadcasting.entity.BannedUser;

public interface BannedUserRepository extends JpaRepository<BannedUser, Long> {
    boolean existsByLectureIdAndChatId(Long lectureId, Long chatId);
}
