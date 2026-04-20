package ru.university.contentservice.repository;

import ru.university.contentservice.entity.SlideSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SlideSequenceRepository extends JpaRepository<SlideSequence, UUID> {
}
