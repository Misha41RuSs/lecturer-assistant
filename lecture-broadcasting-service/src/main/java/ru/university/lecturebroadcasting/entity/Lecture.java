package ru.university.lecturebroadcasting.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "lectures")
@Getter
@Setter
@NoArgsConstructor
public class Lecture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LectureStatus status;

    @Column(name = "current_slide", nullable = false)
    private Integer currentSlide;

    @Column(name = "sequence_id", nullable = true)
    private java.util.UUID sequenceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_type", nullable = false)
    private AccessType accessType = AccessType.OPEN;

    @Column(name = "password", nullable = true)
    private String password;

    public Lecture(String name, java.util.UUID sequenceId) {
        this.name = name;
        this.sequenceId = sequenceId;
        this.status = LectureStatus.CREATED;
        this.currentSlide = 1;
        this.accessType = AccessType.OPEN;
    }
}