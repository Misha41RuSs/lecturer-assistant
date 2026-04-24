package ru.university.lecturebroadcasting.bot;

import ru.university.lecturebroadcasting.repository.StudentRepository;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.QuizServiceClient;
import ru.university.lecturebroadcasting.service.AnalyticsServiceClient;
import ru.university.lecturebroadcasting.service.StudentQuestionService;

public class TestableBot extends LectureBroadcastingBot {
    
    private String lastSentMessage = null;
    
    public TestableBot(String botToken, String botUsername,
                       StudentRepository studentRepository,
                       LectureService lectureService,
                       QuizServiceClient quizServiceClient,
                       AnalyticsServiceClient analyticsServiceClient,
                       StudentQuestionService studentQuestionService) {
        super(botToken, botUsername, studentRepository, lectureService, 
              quizServiceClient, analyticsServiceClient, studentQuestionService);
    }
    
    public void sendText(long chatId, String text) {
        this.lastSentMessage = text;
    }
    
    public String getLastSentMessage() {
        return lastSentMessage;
    }
}