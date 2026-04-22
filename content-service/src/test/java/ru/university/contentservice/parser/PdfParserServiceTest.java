package ru.university.contentservice.parser;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

class PdfParserServiceTest {

    private final PdfParserService pdfParser = new PdfParserService();

    // Создаёт минимальный валидный PDF с 2 страницами
    private byte[] createMinimalValidPdf() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage()); // страница 1
            doc.addPage(new PDPage()); // страница 2
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    @Test
    void shouldParseValidPdfToImages() throws Exception {
        // given - создаём валидный PDF программно
        byte[] pdfBytes = createMinimalValidPdf();
        MultipartFile file = new MockMultipartFile("file", "sample.pdf", "application/pdf", pdfBytes);

        // when
        List<BufferedImage> images = pdfParser.parse(file);

        // then
        assertThat(images).hasSize(2); // 2 страницы
        System.out.println("✅ PDF parsed successfully, pages: " + images.size());
    }

    @Test
    void shouldThrowExceptionOnFakePdfFile() {
        // given - фейковый PDF (просто текст)
        byte[] fakeBytes = "This is not a PDF file".getBytes();
        MultipartFile file = new MockMultipartFile("file", "fake.pdf", "application/pdf", fakeBytes);

        // when/then
        assertThatThrownBy(() -> pdfParser.parse(file))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("End-of-File");

        System.out.println("✅ Correctly failed on fake PDF");
    }

    @Test
    void shouldThrowExceptionOnEmptyFile() {
        // given - пустой файл
        byte[] emptyBytes = new byte[0];
        MultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", emptyBytes);

        // when/then
        assertThatThrownBy(() -> pdfParser.parse(file))
                .isInstanceOf(IOException.class);

        System.out.println("✅ Correctly failed on empty file");
    }
}