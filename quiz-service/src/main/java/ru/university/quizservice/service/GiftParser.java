package ru.university.quizservice.service;

import ru.university.quizservice.dto.CreateExamDto;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class GiftParser {

    private static final Pattern OPTION_PATTERN = Pattern.compile("(?<!\\\\)([=~])((?:[^=~\\\\]|\\\\.)*)");

    public List<CreateExamDto.QuestionDto> parse(String giftText) {
        List<CreateExamDto.QuestionDto> questions = new ArrayList<>();
        giftText = giftText.replace("\r\n", "\n").replace("\r", "\n");

        for (String block : giftText.split("\n\n+")) {
            block = removeLineComments(block).trim();
            if (block.isEmpty() || block.startsWith("$CATEGORY")) continue;
            CreateExamDto.QuestionDto q = parseBlock(block);
            if (q != null) questions.add(q);
        }
        return questions;
    }

    private String removeLineComments(String text) {
        return Arrays.stream(text.split("\n"))
                .map(line -> line.replaceAll("(?<!\\\\)//.*$", ""))
                .reduce("", (a, b) -> a + b + "\n");
    }

    private CreateExamDto.QuestionDto parseBlock(String block) {
        // Remove optional ::title:: prefix
        if (block.startsWith("::")) {
            int end = block.indexOf("::", 2);
            if (end >= 0) block = block.substring(end + 2).trim();
        }

        int braceStart = block.indexOf('{');
        int braceEnd = block.lastIndexOf('}');
        if (braceStart < 0 || braceEnd < 0 || braceEnd < braceStart) return null;

        String questionText = unescape(block.substring(0, braceStart).trim());
        if (questionText.isEmpty()) return null;
        String answerBlock = block.substring(braceStart + 1, braceEnd).trim();

        return parseQuestion(questionText, answerBlock);
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

        if (answerBlock.isEmpty()) {
            return openQuestion(questionText);
        }

        // Numerical: #{number}
        if (answerBlock.startsWith("#")) {
            return openQuestion(questionText);
        }

        // Matching: A -> B
        if (answerBlock.contains("->")) {
            return openQuestion(questionText);
        }

        // Multiple choice with distractors
        if (answerBlock.contains("~")) {
            List<CreateExamDto.OptionDto> options = parseOptions(answerBlock);
            return options.isEmpty() ? null : multipleChoice(questionText, options);
        }

        // Short answer (only = answers) — open
        return openQuestion(questionText);
    }

    private List<CreateExamDto.OptionDto> parseOptions(String answerBlock) {
        List<CreateExamDto.OptionDto> options = new ArrayList<>();
        Matcher m = OPTION_PATTERN.matcher(answerBlock);
        while (m.find()) {
            char prefix = m.group(1).charAt(0);
            String text = m.group(2).trim();
            int hashIdx = text.indexOf('#');
            if (hashIdx >= 0) text = text.substring(0, hashIdx).trim();
            text = text.replaceAll("^%-?\\d+%", "").trim();
            if (text.isEmpty()) continue;
            options.add(new CreateExamDto.OptionDto(unescape(text), prefix == '='));
        }
        return options;
    }

    private String unescape(String text) {
        return text
                .replace("\\~", "~").replace("\\=", "=")
                .replace("\\{", "{").replace("\\}", "}")
                .replace("\\#", "#").replace("\\:", ":").trim();
    }

    private CreateExamDto.QuestionDto multipleChoice(String text, List<CreateExamDto.OptionDto> options) {
        return new CreateExamDto.QuestionDto(text, "MULTIPLE", null, options);
    }

    private CreateExamDto.QuestionDto openQuestion(String text) {
        return new CreateExamDto.QuestionDto(text, "OPEN", null, null);
    }
}