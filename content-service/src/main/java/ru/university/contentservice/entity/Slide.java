//package ru.university.contentservice.entity;
//
//import jakarta.persistence.*;
//import lombok.*;
//
//import java.time.LocalDateTime;
//import java.util.UUID;
//
//@Entity
//@Data
//@NoArgsConstructor
//@AllArgsConstructor
//@Builder
//public class Slide {
//
//    @Id
//    @GeneratedValue
//    private UUID id;
//
//    // Название слайда
//    private String title;
//
//    // Путь к файлу (картинка)
//    private String filePath;
//
//    // Порядковый номер слайда в последовательности
//    private Integer sequence;
//
//    // UUID последовательности слайдов
//    private UUID sequenceId;
//
//    // Дата и время создания
//    private LocalDateTime createdAt;
//}

package ru.university.contentservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "slides")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Slide {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    private String title;

    @Column(name = "file_path")
    private String filePath;

    private Integer version;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "author_id", columnDefinition = "uuid")
    private UUID authorId; // если нужно
}
