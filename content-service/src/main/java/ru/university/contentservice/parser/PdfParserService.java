package ru.university.contentservice.parser;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ForkJoinPool;

@Slf4j
@Service
public class PdfParserService {

    private static final int DPI = 150;
    private static final int MAX_PAGES = 300;
    private static final int CHUNK_SIZE = 8;

    /**
     * Parses a PDF and returns PNG-encoded bytes for each page.
     * Processes in chunks to avoid holding all rendered images in memory simultaneously.
     * A failed page produces an error-placeholder slide instead of aborting the upload.
     */
    public List<byte[]> parse(MultipartFile file) throws IOException {
        log.info("Starting PDF parsing: {}", file.getOriginalFilename());
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFRenderer renderer = new PDFRenderer(document);
            int pageCount = Math.min(document.getNumberOfPages(), MAX_PAGES);
            log.info("PDF loaded. Total pages: {}, will process: {}", document.getNumberOfPages(), pageCount);
            if (pageCount < document.getNumberOfPages()) {
                log.warn("PDF has {} pages — truncated to {}", document.getNumberOfPages(), MAX_PAGES);
            }

            List<byte[]> result = new ArrayList<>(pageCount);
            for (int chunkStart = 0; chunkStart < pageCount; chunkStart += CHUNK_SIZE) {
                int chunkEnd = Math.min(chunkStart + CHUNK_SIZE, pageCount);
                log.debug("Processing chunk: pages {} to {}", chunkStart + 1, chunkEnd);
                List<BufferedImage> chunk = new ArrayList<>(chunkEnd - chunkStart);
                // PDFRenderer is not thread-safe for concurrent access on the same document — render sequentially
                for (int i = chunkStart; i < chunkEnd; i++) {
                    chunk.add(renderPage(renderer, i));
                }
                log.debug("Chunk rendered ({} images), starting encoding", chunk.size());
                encodeChunkParallel(chunk, result);
                log.debug("Chunk encoded, total encoded: {}", result.size());
                // chunk goes out of scope here → BufferedImages eligible for GC
            }
            log.info("PDF parsing completed successfully. Total slides: {}", result.size());
            return result;
        } catch (Exception e) {
            log.error("PDF parsing failed for file: {}", file.getOriginalFilename(), e);
            throw e;
        }
    }

    private BufferedImage renderPage(PDFRenderer renderer, int pageIndex) {
        try {
            return renderer.renderImageWithDPI(pageIndex, DPI);
        } catch (Exception e) {
            log.warn("PDF: failed to render page {} — substituting error slide. Cause: {}", pageIndex + 1, e.getMessage());
            return createErrorSlide(pageIndex + 1);
        }
    }

    private void encodeChunkParallel(List<BufferedImage> chunk, List<byte[]> target) {
        List<CompletableFuture<byte[]>> futures = chunk.stream()
                .map(img -> CompletableFuture.supplyAsync(() -> encodeImage(img), ForkJoinPool.commonPool()))
                .toList();
        futures.stream().map(CompletableFuture::join).forEach(target::add);
    }

    private byte[] encodeImage(BufferedImage img) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(img, "png", baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("PNG encode failed", e);
        }
    }

    private BufferedImage createErrorSlide(int pageNumber) {
        BufferedImage img = new BufferedImage(1280, 720, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            g.setColor(new Color(240, 240, 240));
            g.fillRect(0, 0, 1280, 720);
            g.setColor(new Color(120, 120, 120));
            g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 28));
            String msg = "Страница " + pageNumber + " — ошибка отображения";
            FontMetrics fm = g.getFontMetrics();
            g.drawString(msg, (1280 - fm.stringWidth(msg)) / 2, 360);
        } finally {
            g.dispose();
        }
        return img;
    }
}
