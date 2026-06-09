package ru.university.quizservice.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.university.quizservice.dto.SubmitAnswerDto;
import ru.university.quizservice.dto.SubmissionResultDto;
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

    @Test
    void submitAnswer_updatesExistingAnswerForSameQuestion() {
        UUID examId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID wrongOptionId = UUID.randomUUID();
        UUID correctOptionId = UUID.randomUUID();
        Long chatId = 12345L;

        Exam exam = new Exam();
        exam.setStatus(ExamStatus.ACTIVE);
        ExamQuestion question = question(questionId, exam, wrongOptionId, correctOptionId);
        exam.getQuestions().add(question);

        ExamSubmission submission = new ExamSubmission();
        ReflectionTestUtils.setField(submission, "id", submissionId);
        submission.setExam(exam);
        submission.setChatId(chatId);

        ExamAnswer existing = new ExamAnswer();
        existing.setSubmission(submission);
        existing.setQuestion(question);
        existing.setSelectedOptionId(wrongOptionId);
        existing.setScore(0);

        when(submissionRepository.findByExam_IdAndChatId(examId, chatId))
                .thenReturn(Optional.of(submission));
        when(answerRepository.findBySubmission_IdAndQuestion_Id(submissionId, questionId))
                .thenReturn(Optional.of(existing));
        when(answerRepository.save(any(ExamAnswer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(answerRepository.findBySubmission_Id(submissionId)).thenReturn(List.of(existing));

        ExamAnswer saved = examService.submitAnswer(
                examId,
                chatId,
                new SubmitAnswerDto(questionId.toString(), correctOptionId.toString(), null)
        );

        assertAll(
                () -> assertSame(existing, saved),
                () -> assertEquals(correctOptionId, saved.getSelectedOptionId()),
                () -> assertEquals(10, saved.getScore()),
                () -> assertNull(saved.getOpenText()),
                () -> assertNotNull(submission.getCompletedAt())
        );
    }

    @Test
    void getSubmissions_countsOneCurrentAnswerPerQuestion() {
        UUID examId = UUID.randomUUID();
        UUID submissionId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID wrongOptionId = UUID.randomUUID();
        UUID correctOptionId = UUID.randomUUID();

        Exam exam = new Exam();
        ReflectionTestUtils.setField(exam, "id", examId);
        ExamQuestion question = question(questionId, exam, wrongOptionId, correctOptionId);
        exam.getQuestions().add(question);

        ExamSubmission submission = new ExamSubmission();
        ReflectionTestUtils.setField(submission, "id", submissionId);
        submission.setExam(exam);
        submission.setChatId(12345L);

        ExamAnswer staleAnswer = answer(submission, question, wrongOptionId, 0);
        ExamAnswer currentAnswer = answer(submission, question, correctOptionId, 10);

        when(examRepository.findById(examId)).thenReturn(Optional.of(exam));
        when(submissionRepository.findByExam_IdOrderByStartedAtDesc(examId)).thenReturn(List.of(submission));
        when(answerRepository.findBySubmission_Id(submissionId)).thenReturn(List.of(staleAnswer, currentAnswer));

        List<SubmissionResultDto> submissions = examService.getSubmissions(examId);

        assertAll(
                () -> assertEquals(1, submissions.size()),
                () -> assertEquals(10, submissions.get(0).totalScore()),
                () -> assertEquals(10, submissions.get(0).maxScore()),
                () -> assertEquals(1, submissions.get(0).answers().size()),
                () -> assertEquals(correctOptionId, submissions.get(0).answers().get(0).selectedOptionId())
        );
    }

    private ExamQuestion question(UUID questionId, Exam exam, UUID wrongOptionId, UUID correctOptionId) {
        ExamQuestion question = new ExamQuestion();
        ReflectionTestUtils.setField(question, "id", questionId);
        question.setExam(exam);
        question.setOrderIndex(0);
        question.setText("2 + 2?");
        question.setType(QuestionType.MULTIPLE);
        question.getOptions().add(option(wrongOptionId, question, 0, false));
        question.getOptions().add(option(correctOptionId, question, 1, true));
        return question;
    }

    private ExamOption option(UUID optionId, ExamQuestion question, int orderIndex, boolean correct) {
        ExamOption option = new ExamOption();
        ReflectionTestUtils.setField(option, "id", optionId);
        option.setQuestion(question);
        option.setOrderIndex(orderIndex);
        option.setText(correct ? "4" : "5");
        option.setCorrect(correct);
        return option;
    }

    private ExamAnswer answer(ExamSubmission submission, ExamQuestion question, UUID selectedOptionId, int score) {
        ExamAnswer answer = new ExamAnswer();
        answer.setSubmission(submission);
        answer.setQuestion(question);
        answer.setSelectedOptionId(selectedOptionId);
        answer.setScore(score);
        return answer;
    }
}
