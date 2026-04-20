package ru.university.quizservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.quizservice.entity.UserResponse;

import java.util.List;
import java.util.UUID;

public interface UserResponseRepository extends JpaRepository<UserResponse, UUID> {
    List<UserResponse> findByQuizId(UUID quizId);
}