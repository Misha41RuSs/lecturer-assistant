import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { getLecture, getSlideSequence, BASE_URL } from "../app/api/client";

export function ProjectionPage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [sequenceId, setSequenceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  // Transparent annotation overlay URL (object URL from blob)
  const [annotationsUrl, setAnnotationsUrl] = useState<string | null>(null);
  const prevAnnotationsUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!lectureId) return;
    const loadData = async () => {
      try {
        const lecture = await getLecture(parseInt(lectureId));
        const seqId = lecture.sequenceId;
        if (seqId) {
          setSequenceId(seqId);
          const sequence = await getSlideSequence(seqId);
          setSlideCount(sequence.slides?.length || 0);
          setCurrentSlide(Math.max(0, (lecture.currentSlide || 1) - 1));
        }
      } catch (error) {
        console.error("Failed to load projection data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [lectureId]);

  // Fallback: localStorage sync (same-tab slide changes)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "lecture_slide") {
        const val = parseInt(e.newValue || "0");
        if (!isNaN(val)) setCurrentSlide(val);
      }
    };
    window.addEventListener("storage", handler);
    const initial = localStorage.getItem("lecture_slide");
    if (initial) setCurrentSlide(parseInt(initial) || 0);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // BroadcastChannel: receive slide changes and annotation overlays
  useEffect(() => {
    if (!lectureId) return;
    const channel = new BroadcastChannel(`lecture-${lectureId}`);

    channel.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "slide-change") {
        setCurrentSlide(msg.slideIndex);
        // Clear annotations — this slide has none
        if (prevAnnotationsUrl.current) {
          URL.revokeObjectURL(prevAnnotationsUrl.current);
          prevAnnotationsUrl.current = null;
        }
        setAnnotationsUrl(null);
      } else if (msg.type === "annotations-update") {
        setCurrentSlide(msg.slideIndex);
        if (prevAnnotationsUrl.current) URL.revokeObjectURL(prevAnnotationsUrl.current);
        const url = URL.createObjectURL(msg.blob);
        prevAnnotationsUrl.current = url;
        setAnnotationsUrl(url);
      }
    };

    return () => {
      channel.close();
      if (prevAnnotationsUrl.current) {
        URL.revokeObjectURL(prevAnnotationsUrl.current);
        prevAnnotationsUrl.current = null;
      }
    };
  }, [lectureId]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!sequenceId || slideCount === 0) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-neutral-500 text-center">
          <p className="text-lg">Слайды не найдены</p>
          <p className="text-sm mt-1">Убедитесь, что к лекции привязана презентация</p>
        </div>
      </div>
    );
  }

  const slideIndex = Math.min(currentSlide, slideCount - 1) + 1;
  const slideUrl = `${BASE_URL}/slide-sequences/${sequenceId}/slide/${slideIndex}`;

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center relative">
      {/* Base slide image */}
      <img
        src={slideUrl}
        alt={`Слайд ${slideIndex}`}
        className="w-full h-full object-contain"
      />
      {/* Transparent annotation overlay — positioned identically */}
      {annotationsUrl && (
        <img
          src={annotationsUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}
      <div className="absolute bottom-4 right-6 text-white/30 text-sm">
        {slideIndex} / {slideCount}
      </div>
    </div>
  );
}
