package ru.university.contentservice.parser;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class PdfParserService {

    public List<BufferedImage> parse(MultipartFile file) throws IOException {
        PDDocument document = PDDocument.load(file.getInputStream());
        PDFRenderer renderer = new PDFRenderer(document);

        List<BufferedImage> images = new ArrayList<>();
        for (int i = 0; i < document.getNumberOfPages(); i++) {
            images.add(renderer.renderImageWithDPI(i, 300));
        }

        document.close();
        return images;
    }
}
