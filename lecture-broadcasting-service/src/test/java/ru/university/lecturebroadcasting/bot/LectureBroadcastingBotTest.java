package ru.university.lecturebroadcasting.bot;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.telegram.telegrambots.meta.api.methods.BotApiMethod;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Chat;
import org.telegram.telegrambots.meta.api.objects.Message;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.User;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.entity.Student;
import ru.university.lecturebroadcasting.repository.StudentRepository;
import ru.university.lecturebroadcasting.service.AnalyticsServiceClient;
import ru.university.lecturebroadcasting.service.ComprehensionService;
import ru.university.lecturebroadcasting.service.DeliveryMetricsService;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.PostLectureSurveyService;
import ru.university.lecturebroadcasting.service.QuizServiceClient;
import ru.university.lecturebroadcasting.service.StudentQuestionService;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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
    private PostLectureSurveyService postLectureSurveyService;

    @Mock
    private ComprehensionService comprehensionService;

    @Mock
    private DeliveryMetricsService deliveryMetricsService;

    private CapturingBot bot;

    @BeforeEach
    void setUp() {
        bot = new CapturingBot(
                new org.telegram.telegrambots.bots.DefaultBotOptions(),
                "fake_token", "fake_bot",
                studentRepository, lectureService,
                quizServiceClient, analyticsServiceClient, studentQuestionService,
                postLectureSurveyService, comprehensionService,
                deliveryMetricsService,
                new org.springframework.web.client.RestTemplate(),
                new io.micrometer.core.instrument.simple.SimpleMeterRegistry()
        );
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
    void helpCommand_sendsHelpTextWithMainKeyboard() {
        bot.onUpdateReceived(buildTextUpdate(100L, "/help"));

        SendMessage message = bot.lastSendMessage().orElseThrow();

        assertAll(
                () -> assertTrue(message.getText().contains("Команды бота:")),
                () -> assertTrue(message.getText().contains("/join <название или id>")),
                () -> assertTrue(message.getText().contains("/mystats")),
                () -> assertTrue(message.getText().contains("/ping")),
                () -> assertNotNull(message.getReplyMarkup())
        );
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
    void postLectureSurvey_usesCompactNumericRatingButtons() {
        bot.sendPostLectureSurvey(1L, "Алгебра", List.of(100L));

        SendMessage message = bot.lastSendMessage().orElseThrow();
        InlineKeyboardMarkup keyboard = (InlineKeyboardMarkup) message.getReplyMarkup();

        assertAll(
                () -> assertTrue(message.getText().contains("от 1 до 5")),
                () -> assertEquals(List.of("1", "2", "3", "4", "5"), firstRowTexts(keyboard)),
                () -> assertTrue(firstRowTexts(keyboard).stream().allMatch(text -> text.length() == 1))
        );
    }

    @Test
    void lectureStartedComprehensionKeyboard_stacksLongButtons() {
        bot.notifyLectureStartedToStudents(1L, "Алгебра", 0, List.of(100L));

        SendMessage message = bot.lastSendMessage().orElseThrow();
        InlineKeyboardMarkup keyboard = (InlineKeyboardMarkup) message.getReplyMarkup();

        assertAll(
                () -> assertEquals(3, keyboard.getKeyboard().size()),
                () -> assertTrue(keyboard.getKeyboard().stream().allMatch(row -> row.size() == 1)),
                () -> assertEquals(List.of("🟢 Понял", "🟡 Не до конца", "🔴 Потерялся"),
                        keyboard.getKeyboard().stream()
                                .map(row -> row.get(0).getText())
                                .toList())
        );
    }

    @Test
    void slideNavigation_usesCompactButtonsWithLegendInMessage() {
        bot.sendSlideToStudent(1L, 100L, null, 7);

        SendMessage message = bot.lastSendMessage().orElseThrow();
        InlineKeyboardMarkup keyboard = (InlineKeyboardMarkup) message.getReplyMarkup();

        assertAll(
                () -> assertTrue(message.getText().contains("◀ назад")),
                () -> assertTrue(message.getText().contains("№ выбрать")),
                () -> assertEquals(List.of("◀", "📍", "№"), firstRowTexts(keyboard))
        );
    }

    @Test
    void multipleChoiceQuestion_usesNumberButtonsAndListsOptionsInText() {
        UUID examId = UUID.randomUUID();
        UUID option1 = UUID.randomUUID();
        UUID option2 = UUID.randomUUID();
        QuizServiceClient.ExamDetail.Question question = new QuizServiceClient.ExamDetail.Question(
                UUID.randomUUID().toString(),
                0,
                "Какой вариант выбрать?",
                "MULTIPLE",
                null,
                List.of(
                        new QuizServiceClient.ExamDetail.Option(option1.toString(), "Очень длинный вариант ответа, который не должен становиться кнопкой"),
                        new QuizServiceClient.ExamDetail.Option(option2.toString(), "Короткий ответ")
                )
        );
        QuizServiceClient.ExamDetail detail = new QuizServiceClient.ExamDetail(
                examId.toString(),
                "1",
                "Пробный тест",
                null,
                "ACTIVE",
                List.of(question)
        );
        when(quizServiceClient.startSubmission(examId, 100L)).thenReturn(detail);

        bot.sendExamToStudent(100L, examId);

        SendMessage message = bot.lastSendMessage().orElseThrow();
        InlineKeyboardMarkup keyboard = (InlineKeyboardMarkup) message.getReplyMarkup();

        assertAll(
                () -> assertTrue(message.getText().contains("1. Очень длинный вариант ответа")),
                () -> assertTrue(message.getText().contains("2. Короткий ответ")),
                () -> assertEquals(List.of("1", "2"), firstRowTexts(keyboard))
        );
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
                postLectureSurveyService, comprehensionService,
                deliveryMetricsService,
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

    private static class CapturingBot extends LectureBroadcastingBot {
        private final List<BotApiMethod<?>> sentMethods = new ArrayList<>();

        CapturingBot(org.telegram.telegrambots.bots.DefaultBotOptions options,
                     String botToken,
                     String botUsername,
                     StudentRepository studentRepository,
                     LectureService lectureService,
                     QuizServiceClient quizServiceClient,
                     AnalyticsServiceClient analyticsServiceClient,
                     StudentQuestionService studentQuestionService,
                     PostLectureSurveyService postLectureSurveyService,
                     ComprehensionService comprehensionService,
                     DeliveryMetricsService deliveryMetricsService,
                     org.springframework.web.client.RestTemplate restTemplate,
                     io.micrometer.core.instrument.MeterRegistry meterRegistry) {
            super(options, botToken, botUsername, studentRepository, lectureService, quizServiceClient,
                    analyticsServiceClient, studentQuestionService, postLectureSurveyService,
                    comprehensionService, deliveryMetricsService, restTemplate, meterRegistry);
        }

        @Override
        public <T extends Serializable, Method extends BotApiMethod<T>> T execute(Method method) {
            sentMethods.add(method);
            if (method instanceof SendMessage) {
                Message message = new Message();
                message.setMessageId(sentMethods.size());
                return (T) message;
            }
            return null;
        }

        Optional<SendMessage> lastSendMessage() {
            return sentMethods.stream()
                    .filter(SendMessage.class::isInstance)
                    .map(SendMessage.class::cast)
                    .reduce((first, second) -> second);
        }
    }

    private static List<String> firstRowTexts(InlineKeyboardMarkup keyboard) {
        return keyboard.getKeyboard().get(0).stream()
                .map(button -> button.getText())
                .toList();
    }
}
