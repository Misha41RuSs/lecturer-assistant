package ru.university.quizservice.service;

import ru.university.quizservice.entity.Exam;
import ru.university.quizservice.entity.ExamOption;
import ru.university.quizservice.entity.ExamQuestion;
import ru.university.quizservice.entity.QuestionType;

public class GiftExporter {

    public String export(Exam exam) {
        StringBuilder sb = new StringBuilder();
        sb.append("// ").append(exam.getTitle()).append("\n\n");

        for (ExamQuestion q : exam.getQuestions()) {
            String qText = escape(q.getText());

            if (q.getType() == QuestionType.OPEN) {
                sb.append(qText).append(" {}\n\n");
            } else {
                sb.append(qText).append(" {\n");
                for (ExamOption opt : q.getOptions()) {
                    sb.append(opt.isCorrect() ? "  =" : "  ~").append(escape(opt.getText())).append("\n");
                }
                sb.append("}\n\n");
            }
        }

        return sb.toString();
    }

    private String escape(String text) {
        return text
                .replace("\\", "\\\\")
                .replace("~", "\\~")
                .replace("=", "\\=")
                .replace("{", "\\{")
                .replace("}", "\\}")
                .replace("#", "\\#");
    }
}