package ru.university.contentservice.parser;

import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class PptxParserService {

    public List<BufferedImage> parse(MultipartFile file) throws IOException {
        XMLSlideShow ppt = new XMLSlideShow(file.getInputStream());
        List<BufferedImage> images = new ArrayList<>();

        for (XSLFSlide slide : ppt.getSlides()) {
            BufferedImage img = new BufferedImage(1280, 720, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = img.createGraphics();
            graphics.setPaint(Color.WHITE);
            graphics.fillRect(0, 0, img.getWidth(), img.getHeight());
            slide.draw(graphics);
            images.add(img);
        }

        return images;
    }
}
