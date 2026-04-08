import { useState, useEffect } from "react";

const slides = [
  { id: 1, title: "Введение в алгоритмы", color: "from-neutral-800 to-neutral-900", content: null },
  { id: 2, title: "Что такое алгоритмы?", color: "from-blue-900 to-blue-950", content: ["Сортировка и поиск", "Теория графов", "Динамическое программирование", "Анализ сложности"] },
  { id: 3, title: "Нотация большого О", color: "from-blue-900 to-blue-950", content: ["O(1) — константа", "O(log n) — логарифмическая", "O(n) — линейная", "O(n²) — квадратичная"] },
  { id: 4, title: "Алгоритмы сортировки", color: "from-purple-800 to-purple-900", content: ["Bubble Sort", "Quick Sort", "Merge Sort"] },
  { id: 5, title: "Основы теории графов", color: "from-green-800 to-green-900", content: ["BFS — поиск в ширину", "DFS — поиск в глубину"] },
];

export function ProjectionPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Listen for messages from presenter window
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

  const slide = slides[currentSlide] || slides[0];

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className={`w-full h-full bg-gradient-to-br ${slide.color} flex flex-col justify-center px-[8%] py-[6%]`}>
        <h1 className="text-white text-4xl sm:text-5xl lg:text-7xl mb-6">{slide.title}</h1>
        <p className="text-white/50 text-lg sm:text-xl mb-8">Препод. Иван Петров — Весна 2026</p>
        {slide.content && (
          <ul className="space-y-3">
            {slide.content.map((item, i) => (
              <li key={i} className="text-white/90 text-xl sm:text-2xl lg:text-3xl">• {item}</li>
            ))}
          </ul>
        )}
        <div className="absolute bottom-4 right-6 text-white/30 text-sm">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>
    </div>
  );
}
