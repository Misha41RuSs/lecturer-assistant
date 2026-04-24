package ru.university.quizservice.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.university.quizservice.dto.SubmitAnswerDto;
import ru.university.quizservice.entity.*;
import ru.university.quizservice.repository.ExamAnswerRepository;
import ru.university.quizservice.repository.ExamRepository;
import ru.university.quizservice.repository.ExamSubmissionRepository;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExamServiceTest {

    @Mock
    private ExamRepository examRepository;

    @Mock
    private ExamSubmissionRepository submissionRepository;

    @Mock
    private ExamAnswerRepository answerRepository;

    @InjectMocks
    private ExamService examService;

    @Test
    void shouldThrowExceptionWhenNoActiveSubmission() {
        UUID examId = UUID.randomUUID();
        Long chatId = 12345L;

        when(submissionRepository.findByExam_IdAndChatId(eq(examId), eq(chatId)))
                .thenReturn(Optional.empty());

        SubmitAnswerDto dto = new SubmitAnswerDto(UUID.randomUUID().toString(), UUID.randomUUID().toString(), null);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            examService.submitAnswer(examId, chatId, dto);
        });

        assertEquals("No active submission for chatId=" + chatId, exception.getMessage());
    }

    @Test
    void shouldThrowExceptionWhenExamNotActive() {
        UUID examId = UUID.randomUUID();
        Long chatId = 12345L;

        Exam exam = new Exam();
        exam.setStatus(ExamStatus.DRAFT);

        ExamSubmission submission = new ExamSubmission();
        submission.setExam(exam);
        submission.setChatId(chatId);

        when(submissionRepository.findByExam_IdAndChatId(eq(examId), eq(chatId)))
                .thenReturn(Optional.of(submission));

        SubmitAnswerDto dto = new SubmitAnswerDto(UUID.randomUUID().toString(), UUID.randomUUID().toString(), null);

        Exception exception = assertThrows(IllegalStateException.class, () -> {
            examService.submitAnswer(examId, chatId, dto);
        });

        assertEquals("Exam is already closed", exception.getMessage());
    }
}