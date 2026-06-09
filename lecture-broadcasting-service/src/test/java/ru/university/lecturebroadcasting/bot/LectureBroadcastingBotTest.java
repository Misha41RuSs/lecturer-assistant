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
import ru.university.lecturebroadcasting.service.AnalyticsServiceClient;
import ru.university.lecturebroadcasting.service.DeliveryMetricsService;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.QuizServiceClient;
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

    @Mock
    private DeliveryMetricsService deliveryMetricsService;

    private LectureBroadcastingBot bot;

    @BeforeEach
    void setUp() {
        bot = new LectureBroadcastingBot(
                new org.telegram.telegrambots.bots.DefaultBotOptions(),
                "fake_token", "fake_bot",
                studentRepository, lectureService,
                quizServiceClient, analyticsServiceClient, studentQuestionService,
                deliveryMetricsService,
                new org.springframework.web.client.RestTemplate(),
                new io.micrometer.core.instrument.simple.SimpleMeterRegistry()
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

    @Test
    void testTelegramTrafficMetrics() throws Exception {
        io.micrometer.core.instrument.simple.SimpleMeterRegistry registry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        TelegramTrafficInterceptor interceptor = new TelegramTrafficInterceptor(registry);
        
        org.springframework.web.client.RestTemplate mockRestTemplate = mock(org.springframework.web.client.RestTemplate.class);
        
        LectureBroadcastingBot testBot = new LectureBroadcastingBot(
                new org.telegram.telegrambots.bots.DefaultBotOptions(),
                "fake_token", "fake_bot",
                studentRepository, lectureService,
                quizServiceClient, analyticsServiceClient, studentQuestionService,
                mockRestTemplate, registry
        );
        
        Lecture lecture = new Lecture();
        lecture.setId(42L);
        Student student = new Student(100L, lecture);
        when(studentRepository.findByChatId(100L)).thenReturn(java.util.Optional.of(student));
        
        org.springframework.http.HttpHeaders responseHeaders = new org.springframework.http.HttpHeaders();
        responseHeaders.setContentLength(100);
        
        org.springframework.http.ResponseEntity<String> responseEntity = new org.springframework.http.ResponseEntity<>(
                "{\"ok\":true,\"result\":{\"message_id\":123}}", responseHeaders, org.springframework.http.HttpStatus.OK);
                
        when(mockRestTemplate.exchange(
                anyString(),
                eq(org.springframework.http.HttpMethod.POST),
                any(org.springframework.http.HttpEntity.class),
                eq(String.class)
        )).thenAnswer(invocation -> {
            org.springframework.http.HttpEntity<String> requestEntity = invocation.getArgument(2);
            org.springframework.http.HttpRequest request = mock(org.springframework.http.HttpRequest.class);
            when(request.getHeaders()).thenReturn(requestEntity.getHeaders());
            
            org.springframework.http.client.ClientHttpRequestExecution execution = mock(org.springframework.http.client.ClientHttpRequestExecution.class);
            org.springframework.http.client.ClientHttpResponse mockResponse = mock(org.springframework.http.client.ClientHttpResponse.class);
            when(mockResponse.getHeaders()).thenReturn(responseHeaders);
            when(execution.execute(any(), any())).thenReturn(mockResponse);
            
            byte[] bodyBytes = requestEntity.getBody().getBytes();
            interceptor.intercept(request, bodyBytes, execution);
            
            return responseEntity;
        });
        
        org.telegram.telegrambots.meta.api.methods.send.SendMessage sendMessage = org.telegram.telegrambots.meta.api.methods.send.SendMessage.builder()
                .chatId(100L)
                .text("Hello World")
                .build();
                
        testBot.execute(sendMessage);
        
        double outbound = registry.find("telegram.traffic.outbound.bytes").tag("lecture_id", "42").counter().count();
        double inbound = registry.find("telegram.traffic.inbound.bytes").tag("lecture_id", "42").counter().count();
        
        assertTrue(outbound > 0, "Outbound bytes should be positive");
        assertEquals(100.0, inbound, "Inbound bytes should match mocked response content length");
        
        double totalMb = testBot.getLectureTrafficMb("42");
        assertEquals((outbound + 100.0) / (1024.0 * 1024.0), totalMb, 1e-9);
    }
}
