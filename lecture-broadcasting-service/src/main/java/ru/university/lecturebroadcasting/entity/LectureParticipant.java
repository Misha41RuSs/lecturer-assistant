package ru.university.lecturebroadcasting.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "lecture_participants")
@Getter
@Setter
@NoArgsConstructor
public class LectureParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lecture_id", nullable = false)
    private Long lectureId;

    @Column(name = "chat_id", nullable = false)
    private Long chatId;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "username")
    private String username;

    @Column(name = "kicked", nullable = false)
    private boolean kicked = false;

    public LectureParticipant(Long lectureId, Long chatId, String firstName, String lastName, String username) {
        this.lectureId = lectureId;
        this.chatId = chatId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.kicked = false;
    }
}