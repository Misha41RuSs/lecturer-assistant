package ru.university.quizservice.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.university.quizservice.dto.*;
import ru.university.quizservice.entity.*;
import ru.university.quizservice.repository.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class QuizService {

    private final QuizRepository quizRepository;
    private final UserResponseRepository responseRepository;
    private final SlideQuestionRepository questionRepository;
    private final SlideRatingRepository ratingRepository;

    public QuizService(QuizRepository quizRepository,
                       UserResponseRepository responseRepository,
                       SlideQuestionRepository questionRepository,
                       SlideRatingRepository ratingRepository) {
        this.quizRepository = quizRepository;
        this.responseRepository = responseRepository;
        this.questionRepository = questionRepository;
        this.ratingRepository = ratingRepository;
    }

    @Transactional
    public Quiz createQuiz(UUID lectureId, String title) {
        Quiz quiz = new Quiz();
        quiz.setLectureId(lectureId);
        quiz.setTitle(title);
        return quizRepository.save(quiz);
    }

    public Quiz getQuiz(UUID quizId) {
        return quizRepository.findById(quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found: " + quizId));
    }

    @Transactional
    public UserResponse addResponse(UUID quizId, Long userId, String answer) {
        getQuiz(quizId); // validate exists
        UserResponse r = new UserResponse();
        r.setQuizId(quizId);
        r.setUserId(userId);
        r.setAnswer(answer);
        return responseRepository.save(r);
    }

    public QuizResultsDto getResults(UUID quizId) {
        getQuiz(quizId);
        List<UserResponse> responses = responseRepository.findByQuizId(quizId);
        Map<String, Long> counts = responses.stream()
                .collect(Collectors.groupingBy(UserResponse::getAnswer, Collectors.counting()));
        return new QuizResultsDto(quizId, responses.size(), counts);
    }

    @Transactional
    public SlideQuestion askQuestion(UUID lectureId, UUID slideId, Long userId, String text) {
        SlideQuestion q = new SlideQuestion();
        q.setLectureId(lectureId);
        q.setSlideId(slideId);
        q.setUserId(userId);
        q.setText(text);
        return questionRepository.save(q);
    }

    public List<SlideQuestion> getQuestions(UUID lectureId) {
        return questionRepository.findByLectureIdOrderByCreatedAtDesc(lectureId);
    }

    @Transactional
    public SlideQuestion answerQuestion(UUID questionId, String answer) {
        SlideQuestion q = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));
        q.setAnswer(answer);
        q.setAnswered(true);
        return questionRepository.save(q);
    }

    @Transactional
    public SlideRating rateSlide(UUID slideId, Long userId, int score) {
        if (score < 1 || score > 5) throw new IllegalArgumentException("Score must be 1–5");
        SlideRating rating = ratingRepository.findBySlideIdAndUserId(slideId, userId)
                .orElseGet(SlideRating::new);
        rating.setSlideId(slideId);
        rating.setUserId(userId);
        rating.setScore(score);
        return ratingRepository.save(rating);
    }

    public SlideRatingStatsDto getRatingStats(UUID slideId) {
        List<SlideRating> ratings = ratingRepository.findBySlideId(slideId);
        double avg = ratings.stream()
                .mapToInt(r -> r.getScore() != null ? r.getScore() : 0)
                .average().orElse(0.0);
        return new SlideRatingStatsDto(slideId, ratings.size(), avg);
    }
}