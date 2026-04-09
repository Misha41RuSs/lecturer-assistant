import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { getLecture, getSlideSequence, BASE_URL } from "../app/api/client";

export function ProjectionPage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [sequenceId, setSequenceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Load lecture data
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
          
          // Set initial slide from lecture data
          const currentSlideNum = lecture.currentSlide || 1;
          setCurrentSlide(Math.max(0, currentSlideNum - 1));
        }
      } catch (error) {
        console.error("Failed to load projection data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [lectureId]);

  // Listen for slide changes from presenter window via localStorage
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "lecture_slide") {
        const val = parseInt(e.newValue || "0");
        if (!isNaN(val)) setCurrentSlide(val);
      }
    };
    window.addEventListener("storage", handler);

    // Also poll for initial value
    const initial = localStorage.getItem("lecture_slide");
    if (initial) setCurrentSlide(parseInt(initial) || 0);

    return () => window.removeEventListener("storage", handler);
  }, []);

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
      <img
        src={slideUrl}
        alt={`Слайд ${slideIndex}`}
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-4 right-6 text-white/30 text-sm">
        {slideIndex} / {slideCount}
      </div>
    </div>
  );
}
