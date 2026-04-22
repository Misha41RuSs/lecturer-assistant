package ru.university.lecturebroadcasting.bot;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.telegram.telegrambots.meta.api.objects.Chat;
import org.telegram.telegrambots.meta.api.objects.Message;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.User;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.entity.Student;
import ru.university.lecturebroadcasting.repository.StudentRepository;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.QuizServiceClient;
import ru.university.lecturebroadcasting.service.AnalyticsServiceClient;
import ru.university.lecturebroadcasting.service.StudentQuestionService;

import java.io.Serializable;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LectureBroadcastingBotTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private LectureService lectureService;

    @Mock
    private QuizServiceClient quizServiceClient;

    @Mock
    private AnalyticsServiceClient analyticsServiceClient;

    @Mock
    private StudentQuestionService studentQuestionService;

    private LectureBroadcastingBot bot;

    @BeforeEach
    void setUp() {
        bot = new LectureBroadcastingBot(
                "fake_token", "fake_bot",
                studentRepository, lectureService,
                quizServiceClient, analyticsServiceClient, studentQuestionService
        ) {
            @Override
            public <T extends Serializable, Method extends org.telegram.telegrambots.meta.api.methods.BotApiMethod<T>> T execute(Method method) {
                return null;
            }
        };
    }

    private Update buildTextUpdate(long chatId, String text) {
        User tgUser = new User();
        tgUser.setId(chatId);
        tgUser.setFirstName("Тест");
        
        Message msg = new Message();
        Chat chat = new Chat();
        chat.setId(chatId);
        msg.setChat(chat);
        msg.setFrom(tgUser);
        msg.setText(text);
        
        Update update = new Update();
        update.setMessage(msg);
        return update;
    }

    private Student buildFakeStudent() {
        Lecture lecture = new Lecture("Алгебра", UUID.randomUUID());
        return new Student(100L, lecture);
    }

    @Test
    void startCommand_doesNotThrow() {
        assertDoesNotThrow(() -> bot.onUpdateReceived(buildTextUpdate(100L, "/start")));
    }

    @Test
    void joinCommand_callsLectureService() {
        when(lectureService.joinLecture(eq("Алгебра"), eq(100L), isNull(), any(), any(), any()))
                .thenReturn(buildFakeStudent());

        bot.onUpdateReceived(buildTextUpdate(100L, "/join Алгебра"));

        verify(lectureService).joinLecture(eq("Алгебра"), eq(100L), isNull(), any(), any(), any());
    }

    @Test
    void joinCommand_lectureNotFound_doesNotCrash() {
        when(lectureService.joinLecture(any(), anyLong(), any(), any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Лекция не найдена"));

        assertDoesNotThrow(() -> bot.onUpdateReceived(buildTextUpdate(100L, "/join НеСуществует")));
    }
}
