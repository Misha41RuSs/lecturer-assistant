package ru.university.contentservice.parser;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
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
public class PptxParserService {

    private static final int MAX_SLIDES = 300;
    private static final int CHUNK_SIZE = 8;
    private static final int TARGET_WIDTH = 1280;
    private static final Dimension FALLBACK_SIZE = new Dimension(960, 540);

    /**
     * Parses a PPTX and returns PNG-encoded bytes for each slide.
     * Preserves the presentation's actual aspect ratio.
     * Processes in chunks to control peak memory usage.
     * A failed slide (missing font, unsupported shape, etc.) produces an error-placeholder instead of aborting.
     */
    public List<byte[]> parse(MultipartFile file) throws IOException {
        log.info("Starting PPTX parsing: {}", file.getOriginalFilename());
        try (XMLSlideShow ppt = new XMLSlideShow(file.getInputStream())) {
            List<XSLFSlide> slides = ppt.getSlides();
            log.info("PPTX loaded. Total slides: {}", slides.size());

            Dimension pgSize = ppt.getPageSize();
            if (pgSize == null || pgSize.width <= 0 || pgSize.height <= 0) {
                log.warn("PPTX: could not determine page size, using default 16:9");
                pgSize = FALLBACK_SIZE;
            }
            log.debug("PPTX page size: {}x{}", pgSize.width, pgSize.height);

            int slideCount = Math.min(slides.size(), MAX_SLIDES);
            if (slideCount < slides.size()) {
                log.warn("PPTX has {} slides — truncated to {}", slides.size(), MAX_SLIDES);
            }

            List<byte[]> result = new ArrayList<>(slideCount);
            for (int chunkStart = 0; chunkStart < slideCount; chunkStart += CHUNK_SIZE) {
                int chunkEnd = Math.min(chunkStart + CHUNK_SIZE, slideCount);
                log.debug("Processing chunk: slides {} to {}", chunkStart + 1, chunkEnd);
                List<BufferedImage> chunk = new ArrayList<>(chunkEnd - chunkStart);
                // XMLSlideShow / XSLFSlide rendering is not thread-safe — render sequentially
                for (int i = chunkStart; i < chunkEnd; i++) {
                    chunk.add(renderSlide(slides.get(i), pgSize, i + 1));
                }
                log.debug("Chunk rendered ({} images), starting encoding", chunk.size());
                encodeChunkParallel(chunk, result);
                log.debug("Chunk encoded, total encoded: {}", result.size());
                // chunk goes out of scope here → BufferedImages eligible for GC
            }
            log.info("PPTX parsing completed successfully. Total slides: {}", result.size());
            return result;
        } catch (Exception e) {
            log.error("PPTX parsing failed for file: {}", file.getOriginalFilename(), e);
            throw e;
        }
    }

    private BufferedImage renderSlide(XSLFSlide slide, Dimension pgSize, int slideNumber) {
        double scale = (double) TARGET_WIDTH / pgSize.getWidth();
        int targetHeight = Math.max(1, (int) Math.round(pgSize.getHeight() * scale));

        BufferedImage img = new BufferedImage(TARGET_WIDTH, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            applyRenderingHints(g);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, TARGET_WIDTH, targetHeight);
            g.scale(scale, scale);
            slide.draw(g);
        } catch (Exception e) {
            log.warn("PPTX: failed to render slide {} — substituting error slide. Cause: {}", slideNumber, e.getMessage());
            g.dispose();
            return createErrorSlide(slideNumber, TARGET_WIDTH, targetHeight);
        } finally {
            g.dispose();
        }
        return img;
    }

    private void applyRenderingHints(Graphics2D g) {
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,     RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING,        RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,    RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS,RenderingHints.VALUE_FRACTIONALMETRICS_ON);
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL,   RenderingHints.VALUE_STROKE_PURE);
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

    private BufferedImage createErrorSlide(int slideNumber, int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            g.setColor(new Color(255, 242, 242));
            g.fillRect(0, 0, w, h);
            g.setColor(new Color(160, 60, 60));
            g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 24));
            String msg = "Слайд " + slideNumber + " — ошибка отображения";
            FontMetrics fm = g.getFontMetrics();
            g.drawString(msg, (w - fm.stringWidth(msg)) / 2, h / 2);
        } finally {
            g.dispose();
        }
        return img;
    }
}
