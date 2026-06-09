package ru.university.quizservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.university.quizservice.dto.CreateExamDto;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

class GiftParserTest {

    private GiftParser giftParser;

    @BeforeEach
    void setUp() {
        giftParser = new GiftParser();
    }

    // ========== ТЕСТЫ НА СТРОКАХ (без файлов) ==========

    @Test
    void shouldParseValidMultipleChoiceQuestion() {
        // given
        String giftText = "Столица Франции? { ~Лондон =Париж ~Берлин ~Мадрид }";

        // when
        List<CreateExamDto.QuestionDto> questions = giftParser.parse(giftText);

        // then
        assertThat(questions).hasSize(1);
        CreateExamDto.QuestionDto question = questions.get(0);
        assertThat(question.type()).isEqualTo("MULTIPLE");
        assertThat(question.options()).hasSize(4);

        boolean hasCorrect = question.options().stream().anyMatch(opt -> opt.correct());
        assertThat(hasCorrect).isTrue();

        System.out.println("✅ Valid multiple choice parsed");
    }

    @Test
    void shouldParseTrueFalseQuestion() {
        // given
        String giftText = "Земля круглая. {TRUE}";

        // when
        List<CreateExamDto.QuestionDto> questions = giftParser.parse(giftText);

        // then
        assertThat(questions).hasSize(1);
        CreateExamDto.QuestionDto question = questions.get(0);
        assertThat(question.options()).hasSize(2);

        System.out.println("✅ TRUE/FALSE parsed");
    }

    @Test
    void shouldParseMultipleQuestions() {
        // given
        String giftText = """
            Вопрос 1? { =Ответ1 ~Ответ2 }
            Вопрос 2? { ~А =Б }
            """;

        // when
        List<CreateExamDto.QuestionDto> questions = giftParser.parse(giftText);

        // then
        assertThat(questions).hasSize(2);
        System.out.println("✅ Multiple questions parsed: " + questions.size());
    }

    @Test
    void shouldReturnEmptyListForEmptyString() {
        // when
        List<CreateExamDto.QuestionDto> questions = giftParser.parse("");

        // then
        assertThat(questions).isEmpty();
        System.out.println("✅ Empty string returns empty list");
    }

    // ========== НЕГАТИВНЫЕ ТЕСТЫ (fail-fast — нет 500 ошибки) ==========

    @Test
    void shouldNotCrashOnNoCorrectAnswer() {
        // given — вопрос без правильного ответа (нет =)
        String giftText = "Столица Франции? { ~Лондон ~Париж ~Берлин }";

        // when/then — не должно быть исключения (парсер должен пережить это)
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ No correct answer - no crash");
    }

    @Test
    void shouldNotCrashOnBrokenBrackets() {
        // given
        String giftText = "Вопрос? { ~Ответ1 =Ответ2";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Broken brackets - no crash");
    }

    @Test
    void shouldNotCrashOnEmptyQuestion() {
        // given
        String giftText = "{ ~А =Б }";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Empty question text - no crash");
    }

    @Test
    void shouldNotCrashOnMalformedOptions() {
        // given
        String giftText = "Вопрос? { А Б В }";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Malformed options - no crash");
    }

    @Test
    void shouldNotCrashOnCompletelyInvalidFormat() {
        // given
        String giftText = "Это просто текст, не GIFT формат";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Invalid format - no crash");
    }

    // ========== ТЕСТ НА ЭКРАНИРОВАНИЕ ==========

    @Test
    void shouldHandleEscapedCharacters() {
        // given — экранированные символы \= \{ \}
        String giftText = "Вопрос с \\= экранированием \\{скобок\\}? { ~Обычный =Ответ с \\= знаком }";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Escaped characters handled");
    }

    @Test
    void shouldStripBomFromGiftFiles() throws IOException {
        // given
        String giftText = readResource("/gift/valid/simple-mc.txt");

        // when
        List<CreateExamDto.QuestionDto> questions = giftParser.parse(giftText);

        // then
        assertThat(questions).hasSize(1);
        assertThat(questions.get(0).text()).isEqualTo("Столица Франции?");
        assertThat(questions.get(0).text()).doesNotStartWith("\uFEFF");
    }

    @Test
    void shouldParseAllSupportedGiftResourceFormats() throws IOException {
        // given
        String giftText = readResource("/gift/valid/all-formats.txt");

        // when
        List<CreateExamDto.QuestionDto> questions = giftParser.parse(giftText);

        // then
        assertThat(questions).hasSize(7);
        assertThat(questions).extracting(CreateExamDto.QuestionDto::type)
                .containsExactly("MULTIPLE", "MULTIPLE", "OPEN", "MULTIPLE", "OPEN", "OPEN", "OPEN");
    }

    @Test
    void shouldKeepEscapedHashInsideAnswerOption() {
        // given
        String giftText = "Какой язык использует CLR? { =C\\# ~Java }";

        // when
        List<CreateExamDto.QuestionDto> questions = giftParser.parse(giftText);

        // then
        assertThat(questions).hasSize(1);
        assertThat(questions.get(0).options())
                .extracting(CreateExamDto.OptionDto::text)
                .contains("C#");
    }

    @Test
    void shouldParseQuestionTextContainingBraces() {
        // given
        String giftText = "Что вернёт map {key=value}? { =value ~key }";

        // when
        List<CreateExamDto.QuestionDto> questions = giftParser.parse(giftText);

        // then
        assertThat(questions).hasSize(1);
        assertThat(questions.get(0).text()).isEqualTo("Что вернёт map {key=value}?");
        assertThat(questions.get(0).options()).hasSize(2);
    }

    private String readResource(String path) throws IOException {
        try (InputStream in = getClass().getResourceAsStream(path)) {
            assertThat(in).as("resource %s", path).isNotNull();
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
