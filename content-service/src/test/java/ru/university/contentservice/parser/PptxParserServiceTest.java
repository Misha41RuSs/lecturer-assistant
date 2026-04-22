package ru.university.contentservice.parser;

import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

class PptxParserServiceTest {

    private final PptxParserService pptxParser = new PptxParserService();

    // Создаёт минимальный валидный PPTX с 2 слайдами
    private byte[] createMinimalValidPptx() throws IOException {
        try (XMLSlideShow ppt = new XMLSlideShow()) {
            ppt.createSlide(); // слайд 1
            ppt.createSlide(); // слайд 2
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ppt.write(out);
            return out.toByteArray();
        }
    }

    @Test
    void shouldParseValidPptxToImages() throws Exception {
        // given - создаём валидный PPTX программно
        byte[] pptxBytes = createMinimalValidPptx();
        MultipartFile file = new MockMultipartFile("file", "sample.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", pptxBytes);

        // when
        List<BufferedImage> images = pptxParser.parse(file);

        // then
        assertThat(images).hasSize(2); // 2 слайда
        System.out.println("✅ PPTX parsed successfully, slides: " + images.size());
    }

    @Test
    void shouldThrowExceptionOnCorruptedFile() {
        // given - фейковый PPTX
        byte[] fakeBytes = "This is not a PPTX file".getBytes();
        MultipartFile file = new MockMultipartFile("file", "fake.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", fakeBytes);

        // when/then
        assertThatThrownBy(() -> pptxParser.parse(file))
                .isInstanceOf(Exception.class);

        System.out.println("✅ Correctly failed on corrupted file");
    }

    @Test
    void shouldThrowExceptionOnEmptyFile() {
        // given - пустой файл
        byte[] emptyBytes = new byte[0];
        MultipartFile file = new MockMultipartFile("file", "empty.pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation", emptyBytes);

        // when/then
        assertThatThrownBy(() -> pptxParser.parse(file))
                .isInstanceOf(Exception.class);

        System.out.println("✅ Correctly failed on empty file");
    }
}