package ru.university.lecturebroadcasting.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

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
    @JsonIgnore
    private String password;

    @Column(name = "duration_minutes")
    private Integer durationMinutes = 90;

    @Column(name = "allow_questions")
    private Boolean allowQuestions = true;

    @Column(name = "anonymous_questions")
    private Boolean anonymousQuestions = false;

    @Column(name = "notified_start_at")
    private Instant notifiedStartAt;

    public Lecture(String name, java.util.UUID sequenceId) {
        this.name = name;
        this.sequenceId = sequenceId;
        this.status = LectureStatus.CREATED;
        this.currentSlide = 1;
        this.accessType = AccessType.OPEN;
    }

    public boolean isHasPassword() {
        return password != null && !password.isBlank();
    }
}
