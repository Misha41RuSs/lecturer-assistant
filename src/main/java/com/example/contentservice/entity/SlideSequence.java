//package com.example.contentservice.entity;
//
//import jakarta.persistence.ElementCollection;
//import jakarta.persistence.Entity;
//import jakarta.persistence.Id;
//import lombok.Data;
//
//import java.util.List;
//import java.util.UUID;
//
//@Entity
//@Data
//public class SlideSequence {
//
//    @Id
//    private UUID id;
//
//    private String name;
//
//    @ElementCollection
//    private List<UUID> slides;
//}

package com.example.contentservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "slide_sequences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlideSequence {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    private String name;

    @ElementCollection
    @CollectionTable(name = "slide_sequence_slides", joinColumns = @JoinColumn(name = "sequence_id"))
    @Column(name = "slide_id", columnDefinition = "uuid")
    private List<UUID> slides;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}