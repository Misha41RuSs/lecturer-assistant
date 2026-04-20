package ru.university.quizservice.service;

import ru.university.quizservice.dto.CreateExamDto;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class GiftParser {

    private static final Pattern OPTION_PATTERN = Pattern.compile("(?<!\\\\)([=~])((?:[^=~\\\\]|\\\\.)*)");
    private static final Pattern PERCENT_PATTERN = Pattern.compile("^%(-?\\d+)%");

    public List<CreateExamDto.QuestionDto> parse(String giftText) {
        List<CreateExamDto.QuestionDto> questions = new ArrayList<>();
        giftText = giftText.replace("\r\n", "\n").replace("\r", "\n");
        giftText = removeLineComments(giftText);

        for (String block : extractBlocks(giftText)) {
            block = block.trim();
            if (block.isEmpty() || block.startsWith("$CATEGORY")) continue;
            CreateExamDto.QuestionDto q = parseBlock(block);
            if (q != null) questions.add(q);
        }
        return questions;
    }

    // Extracts question blocks by finding each { ... } pair with everything preceding it
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
            sb.append(line.replaceAll("(?<!\\\\)//.*$", "")).append("\n");
        }
        return sb.toString();
    }

    private CreateExamDto.QuestionDto parseBlock(String block) {
        // Remove optional ::title:: prefix
        if (block.startsWith("::")) {
            int end = block.indexOf("::", 2);
            if (end >= 0) block = block.substring(end + 2).trim();
        }

        int braceStart = block.indexOf('{');
        int braceEnd = block.lastIndexOf('}');
        if (braceStart < 0 || braceEnd < 0 || braceEnd <= braceStart) return null;

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
        if (answerBlock.isEmpty()) return openQuestion(questionText);
        if (answerBlock.startsWith("#")) return openQuestion(questionText);
        if (answerBlock.contains("->")) return openQuestion(questionText);

        // Multiple choice (has ~ or = options)
        if (answerBlock.contains("~") || answerBlock.contains("=")) {
            // Short-answer: only = and no ~
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

            // Remove feedback (#...)
            int hashIdx = text.indexOf('#');
            if (hashIdx >= 0) text = text.substring(0, hashIdx).trim();

            // Check percentage before stripping: %50% → correct, %-50% → wrong
            boolean percentCorrect = false;
            Matcher pm = PERCENT_PATTERN.matcher(text);
            if (pm.find()) {
                int pct = Integer.parseInt(pm.group(1));
                percentCorrect = pct > 0;
            }
            text = text.replaceAll("^%-?\\d+%", "").trim();

            if (text.isEmpty()) continue;
            boolean correct = prefix == '=' || percentCorrect;
            options.add(new CreateExamDto.OptionDto(unescape(text), correct));
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