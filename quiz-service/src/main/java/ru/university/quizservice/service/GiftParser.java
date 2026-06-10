package ru.university.quizservice.service;

import ru.university.quizservice.dto.CreateExamDto;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class GiftParser {

    private static final Pattern OPTION_PATTERN = Pattern.compile("(?<!\\\\)([=~])((?:[^=~\\\\#]|\\\\.)*)");
    private static final Pattern PERCENT_PATTERN = Pattern.compile("^%(-?\\d+(?:\\.\\d+)?)%");
    private static final Pattern PERCENT_CLEANUP = Pattern.compile("^%-?\\d+(?:\\.\\d+)?%");
    private static final Pattern FORMAT_ANNOTATION = Pattern.compile("^\\[(html|plain|markdown|moodle)\\]", Pattern.CASE_INSENSITIVE);

    public List<CreateExamDto.QuestionDto> parse(String giftText) {
        List<CreateExamDto.QuestionDto> questions = new ArrayList<>();
        giftText = giftText.replace("\r\n", "\n").replace("\r", "\n");
        giftText = removeLineComments(giftText);
        giftText = removeSubheadings(giftText);

        for (String block : extractBlocks(giftText)) {
            block = block.trim();
            if (block.isEmpty() || block.startsWith("$CATEGORY")) continue;
            CreateExamDto.QuestionDto q = parseBlock(block);
            if (q != null) questions.add(q);
        }
        return questions;
    }

    private List<String> extractBlocks(String text) {
        List<String> blocks = new ArrayList<>();
        int pos = 0;
        int blockStart = 0;
        int len = text.length();

        while (pos < len) {
            if (text.charAt(pos) == '\\' && pos + 1 < len) {
                pos += 2;
                continue;
            }
            if (text.charAt(pos) == '{') {
                int depth = 1;
                pos++;
                while (pos < len && depth > 0) {
                    if (text.charAt(pos) == '\\' && pos + 1 < len) { pos += 2; continue; }
                    if (text.charAt(pos) == '{') depth++;
                    else if (text.charAt(pos) == '}') depth--;
                    pos++;
                }
                String block = text.substring(blockStart, pos).trim();
                if (!block.isEmpty()) blocks.add(block);
                blockStart = pos;
            } else {
                pos++;
            }
        }
        return blocks;
    }

    private String removeLineComments(String text) {
        StringBuilder sb = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            // Удаляем // только если они не предшествуют :/  (защита от URL http://)
            String cleaned = line.replaceAll("(?<!:)(?<!\\\\)//.*$", "");
            sb.append(cleaned).append("\n");
        }
        return sb.toString();
    }

    private String removeSubheadings(String text) {
        StringBuilder sb = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            if (!line.trim().startsWith("==")) {
                sb.append(line).append("\n");
            }
        }
        return sb.toString();
    }

    private CreateExamDto.QuestionDto parseBlock(String block) {
        // Убираем опциональный ::title:: префикс
        if (block.startsWith("::")) {
            int end = block.indexOf("::", 2);
            if (end >= 0) block = block.substring(end + 2).trim();
        }

        // Убираем формат-аннотацию [html], [markdown], [plain]
        Matcher fmt = FORMAT_ANNOTATION.matcher(block);
        if (fmt.find()) {
            block = block.substring(fmt.end()).trim();
        }

        // Ищем открывающую нескейпнутую фигурную скобку
        int braceStart = findUnescaped(block, '{', 0);
        if (braceStart < 0) return null;

        // Закрывающая скобка — соответствующая открывающей (парная), не просто lastIndexOf
        int braceEnd = findMatchingClose(block, braceStart);
        if (braceEnd < 0) return null;

        String questionText = unescape(block.substring(0, braceStart).trim());
        if (questionText.isEmpty()) return null;
        String answerBlock = block.substring(braceStart + 1, braceEnd).trim();

        return parseQuestion(questionText, answerBlock);
    }

    // Находит позицию символа target, пропуская экранированные (\target)
    private int findUnescaped(String s, char target, int from) {
        for (int i = from; i < s.length(); i++) {
            if (s.charAt(i) == '\\' && i + 1 < s.length()) { i++; continue; }
            if (s.charAt(i) == target) return i;
        }
        return -1;
    }

    // Находит позицию закрывающей '}' с учётом вложенности
    private int findMatchingClose(String s, int openPos) {
        int depth = 1;
        int i = openPos + 1;
        while (i < s.length() && depth > 0) {
            if (s.charAt(i) == '\\' && i + 1 < s.length()) { i += 2; continue; }
            if (s.charAt(i) == '{') depth++;
            else if (s.charAt(i) == '}') depth--;
            i++;
        }
        return depth == 0 ? i - 1 : -1;
    }

    private CreateExamDto.QuestionDto parseQuestion(String questionText, String answerBlock) {
        String upper = answerBlock.toUpperCase().trim();

        if (upper.equals("TRUE") || upper.equals("T")) {
            return multipleChoice(questionText, List.of(
                    new CreateExamDto.OptionDto("Верно", true),
                    new CreateExamDto.OptionDto("Неверно", false)));
        }
        if (upper.equals("FALSE") || upper.equals("F")) {
            return multipleChoice(questionText, List.of(
                    new CreateExamDto.OptionDto("Верно", false),
                    new CreateExamDto.OptionDto("Неверно", true)));
        }
        if (answerBlock.isEmpty()) return openQuestion(questionText);
        if (answerBlock.startsWith("#")) return openQuestion(questionText);
        if (answerBlock.contains("->")) return openQuestion(questionText);

        if (answerBlock.contains("~") || answerBlock.contains("=")) {
            // Только = без ~ → короткий ответ, трактуем как открытый
            if (!answerBlock.contains("~")) return openQuestion(questionText);

            List<CreateExamDto.OptionDto> options = parseOptions(answerBlock);
            return options.isEmpty() ? null : multipleChoice(questionText, options);
        }

        return openQuestion(questionText);
    }

    private List<CreateExamDto.OptionDto> parseOptions(String answerBlock) {
        List<CreateExamDto.OptionDto> options = new ArrayList<>();
        Matcher m = OPTION_PATTERN.matcher(answerBlock);
        while (m.find()) {
            char prefix = m.group(1).charAt(0);
            String text = m.group(2).trim();

            // Убираем фидбек (#...)
            int hashIdx = findUnescaped(text, '#', 0);
            if (hashIdx >= 0) text = text.substring(0, hashIdx).trim();

            // Проверяем процентный вес: %50% → частично верно, %-100% → неверно
            boolean percentCorrect = false;
            Matcher pm = PERCENT_PATTERN.matcher(text);
            if (pm.find()) {
                double pct = Double.parseDouble(pm.group(1));
                percentCorrect = pct > 0;
            }
            text = PERCENT_CLEANUP.matcher(text).replaceFirst("").trim();

            if (text.isEmpty()) continue;
            boolean correct = prefix == '=' || percentCorrect;
            options.add(new CreateExamDto.OptionDto(unescape(text), correct));
        }
        return options;
    }

    private String unescape(String text) {
        StringBuilder sb = new StringBuilder(text.length());
        int i = 0;
        while (i < text.length()) {
            char c = text.charAt(i);
            if (c == '\\' && i + 1 < text.length()) {
                sb.append(text.charAt(i + 1));
                i += 2;
            } else {
                sb.append(c);
                i++;
            }
        }
        return sb.toString().trim();
    }

    private CreateExamDto.QuestionDto multipleChoice(String text, List<CreateExamDto.OptionDto> options) {
        return new CreateExamDto.QuestionDto(text, "MULTIPLE", null, options);
    }

    private CreateExamDto.QuestionDto openQuestion(String text) {
        return new CreateExamDto.QuestionDto(text, "OPEN", null, null);
    }
}
