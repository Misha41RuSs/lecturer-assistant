package ru.university.lecturebroadcasting.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chat_id", nullable = false, unique = true)
    private Long chatId;

    /** EAGER: бот читает getLecture().getName() уже после commit транзакции join. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "lecture_id")
    private Lecture lecture;

    public Student(Long chatId, Lecture lecture) {
        this.chatId = chatId;
        this.lecture = lecture;
    }
}