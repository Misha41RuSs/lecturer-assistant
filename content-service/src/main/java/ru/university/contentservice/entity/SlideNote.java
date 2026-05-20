package ru.university.contentservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "slide_notes",
        uniqueConstraints = @UniqueConstraint(columnNames = {"lecture_id", "slide_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlideNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID лекции (из lecture-broadcasting-service) */
    @Column(name = "lecture_id", nullable = false)
    private Long lectureId;

    /** UUID слайда из slide_sequences.slides[] */
    @Column(name = "slide_id", nullable = false, columnDefinition = "uuid")
    private UUID slideId;

    @Column(columnDefinition = "TEXT")
    private String text;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
