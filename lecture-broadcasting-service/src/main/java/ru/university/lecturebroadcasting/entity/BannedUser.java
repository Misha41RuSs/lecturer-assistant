package ru.university.lecturebroadcasting.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "banned_users")
@Getter
@Setter
@NoArgsConstructor
public class BannedUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lecture_id", nullable = false)
    private Long lectureId;

    @Column(name = "chat_id", nullable = false)
    private Long chatId;

    public BannedUser(Long lectureId, Long chatId) {
        this.lectureId = lectureId;
        this.chatId = chatId;
    }
}
