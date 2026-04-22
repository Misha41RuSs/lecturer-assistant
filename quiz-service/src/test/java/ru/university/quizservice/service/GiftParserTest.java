package ru.university.quizservice.service;

import org.junit.Before;
import org.junit.Test;
import ru.university.quizservice.dto.CreateExamDto;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

public class GiftParserTest {

    private GiftParser giftParser;

    @Before
    public void setUp() {
        giftParser = new GiftParser();
    }

    // ========== ТЕСТЫ НА СТРОКАХ (без файлов) ==========

    @Test
    public void shouldParseValidMultipleChoiceQuestion() {
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
    public void shouldParseTrueFalseQuestion() {
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
    public void shouldParseMultipleQuestions() {
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
    public void shouldReturnEmptyListForEmptyString() {
        // when
        List<CreateExamDto.QuestionDto> questions = giftParser.parse("");

        // then
        assertThat(questions).isEmpty();
        System.out.println("✅ Empty string returns empty list");
    }

    // ========== НЕГАТИВНЫЕ ТЕСТЫ (fail-fast — нет 500 ошибки) ==========

    @Test
    public void shouldNotCrashOnNoCorrectAnswer() {
        // given — вопрос без правильного ответа (нет =)
        String giftText = "Столица Франции? { ~Лондон ~Париж ~Берлин }";

        // when/then — не должно быть исключения (парсер должен пережить это)
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ No correct answer - no crash");
    }

    @Test
    public void shouldNotCrashOnBrokenBrackets() {
        // given
        String giftText = "Вопрос? { ~Ответ1 =Ответ2";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Broken brackets - no crash");
    }

    @Test
    public void shouldNotCrashOnEmptyQuestion() {
        // given
        String giftText = "{ ~А =Б }";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Empty question text - no crash");
    }

    @Test
    public void shouldNotCrashOnMalformedOptions() {
        // given
        String giftText = "Вопрос? { А Б В }";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Malformed options - no crash");
    }

    @Test
    public void shouldNotCrashOnCompletelyInvalidFormat() {
        // given
        String giftText = "Это просто текст, не GIFT формат";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Invalid format - no crash");
    }

    // ========== ТЕСТ НА ЭКРАНИРОВАНИЕ ==========

    @Test
    public void shouldHandleEscapedCharacters() {
        // given — экранированные символы \= \{ \}
        String giftText = "Вопрос с \\= экранированием \\{скобок\\}? { ~Обычный =Ответ с \\= знаком }";

        // when/then
        assertThatCode(() -> giftParser.parse(giftText))
                .doesNotThrowAnyException();

        System.out.println("✅ Escaped characters handled");
    }
}