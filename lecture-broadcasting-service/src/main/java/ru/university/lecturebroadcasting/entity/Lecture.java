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

    public Lecture(String name) {
        this.name = name;
        this.status = LectureStatus.CREATED;
        this.currentSlide = 1;
    }
}