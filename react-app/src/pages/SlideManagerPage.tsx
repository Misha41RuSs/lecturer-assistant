import { useState } from "react";
import { Trash2, Eye, MessageSquare, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

interface Slide {
  id: number;
  title: string;
  color: string;
  comment: string;
  content?: string[];
}

export function SlideManagerPage() {
  const [slides, setSlides] = useState<Slide[]>([
    { id: 1, title: "Введение в алгоритмы", color: "from-neutral-800 to-neutral-900", comment: "" },
    { id: 2, title: "Что такое алгоритмы?", color: "from-blue-900 to-blue-950", comment: "Объяснить на примере сортировки массива", content: ["Сортировка и поиск", "Теория графов", "Динамическое программирование"] },
    { id: 3, title: "Нотация большого О", color: "from-blue-900 to-blue-950", comment: "", content: ["O(1) — константа", "O(log n) — логарифмическая", "O(n) — линейная"] },
    { id: 4, title: "Алгоритмы сортировки", color: "from-purple-800 to-purple-900", comment: "Показать анимацию bubble sort", content: ["Bubble Sort", "Quick Sort", "Merge Sort"] },
    { id: 5, title: "Основы теории графов", color: "from-green-800 to-green-900", comment: "" },
  ]);

  const [selectedId, setSelectedId] = useState(1);
  const [commentText, setCommentText] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);

  const selectedSlide = slides.find((s) => s.id === selectedId);

  const selectSlide = (s: Slide) => {
    setSelectedId(s.id);
    setCommentText(s.comment);
  };

  const deleteSlide = (id: number) => {
    if (slides.length <= 1) { toast.error("Нельзя удалить последний слайд"); return; }
    const next = slides.filter((s) => s.id !== id);
    setSlides(next);
    if (selectedId === id) selectSlide(next[0]);
    toast.success("Слайд удалён");
  };

  const moveSlide = (id: number, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    if (idx + dir < 0 || idx + dir >= slides.length) return;
    const next = [...slides];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    setSlides(next);
  };

  const saveComment = () => {
    setSlides(slides.map((s) => s.id === selectedId ? { ...s, comment: commentText } : s));
    toast.success("Комментарий сохранён");
  };

  const removeComment = () => {
    setCommentText("");
    setSlides(slides.map((s) => s.id === selectedId ? { ...s, comment: "" } : s));
    toast.success("Комментарий удалён");
  };

  const openPreview = () => {
    setPreviewSlide(slides.findIndex((s) => s.id === selectedId));
    setPreviewOpen(true);
  };

  // Full-screen read-only preview modal
  if (previewOpen) {
    const slide = slides[previewSlide];
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-900">
          <span className="text-white text-sm">Предпросмотр — {slide.title}</span>
          <div className="flex items-center gap-3">
            <span className="text-neutral-400 text-sm">{previewSlide + 1} / {slides.length}</span>
            <button onClick={() => setPreviewOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className={`w-full max-w-5xl aspect-video bg-gradient-to-br ${slide.color} rounded-lg p-8 sm:p-12 lg:p-16 flex flex-col justify-center`}>
            <h1 className="text-white text-2xl sm:text-4xl lg:text-5xl mb-4">{slide.title}</h1>
            <p className="text-white/60 text-sm sm:text-base mb-4">Препод. Иван Петров — Весна 2026</p>
            {slide.content && (
              <ul className="space-y-2 mt-2">
                {slide.content.map((item, i) => (
                  <li key={i} className="text-white/90 text-sm sm:text-lg">• {item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 pb-6">
          <button onClick={() => setPreviewSlide(Math.max(0, previewSlide - 1))} disabled={previewSlide === 0}
            className="p-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setPreviewSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === previewSlide ? "bg-orange-500" : "bg-neutral-600 hover:bg-neutral-500"}`} />
            ))}
          </div>
          <button onClick={() => setPreviewSlide(Math.min(slides.length - 1, previewSlide + 1))} disabled={previewSlide === slides.length - 1}
            className="p-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-1 text-sm text-neutral-500 mb-1">
            <Link to="/my-lectures" className="hover:text-orange-500 transition-colors">Мои лекции</Link>
            <span>/</span>
            <span className="text-neutral-900">Менеджер слайдов</span>
          </div>
          <h1 className="mb-0">Менеджер слайдов</h1>
          <p className="text-sm text-neutral-500">Введение в алгоритмы · {slides.length} слайдов</p>
        </div>
        <div className="flex gap-2">
          <Link to="/settings/1" className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
            Настройки лекции
          </Link>
          <button onClick={openPreview} className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm">
            <Eye className="w-4 h-4" /> Предпросмотр
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-sm text-blue-900">
        Используйте стрелки для перемещения слайдов. Выберите слайд для добавления комментария к показу.
      </div>

      {/* Slides Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
        {slides.map((slide, idx) => (
          <div key={slide.id} onClick={() => selectSlide(slide)}
            className={`relative group cursor-pointer rounded-lg transition-all ${
              selectedId === slide.id ? "ring-2 ring-orange-500 scale-[1.02]" : "hover:ring-1 hover:ring-neutral-300"
            }`}>
            <div className={`aspect-video bg-gradient-to-br ${slide.color} rounded-lg p-3 flex items-center justify-center`}>
              <div className="text-white text-xs text-center line-clamp-2">{slide.title}</div>
            </div>
            <div className="absolute bottom-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-xs">{String(idx + 1).padStart(2, "0")}</div>

            {slide.comment && (
              <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-white" />
              </div>
            )}

            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); moveSlide(slide.id, -1); }}
                disabled={idx === 0}
                className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow hover:bg-neutral-100 disabled:opacity-30">
                <ArrowUp className="w-3 h-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); moveSlide(slide.id, 1); }}
                disabled={idx === slides.length - 1}
                className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow hover:bg-neutral-100 disabled:opacity-30">
                <ArrowDown className="w-3 h-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); deleteSlide(slide.id); }}
                className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50">
                <Trash2 className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected slide details + comment */}
      {selectedSlide && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px),1fr] gap-6">
          <div>
            <h3 className="text-sm mb-3">Слайд {slides.findIndex((s) => s.id === selectedId) + 1}: {selectedSlide.title}</h3>
            <div className={`aspect-video bg-gradient-to-br ${selectedSlide.color} rounded-lg p-6 sm:p-8 flex flex-col justify-center`}>
              <h2 className="text-white text-lg sm:text-xl mb-2">{selectedSlide.title}</h2>
              <p className="text-white/70 text-sm">Препод. Иван Петров — Весна 2026</p>
              {selectedSlide.content && (
                <ul className="mt-3 space-y-1">
                  {selectedSlide.content.map((item, i) => (
                    <li key={i} className="text-white/80 text-xs">• {item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-neutral-200">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm">Комментарий к слайду</h3>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Комментарий виден только вам в режиме показа. Студенты и проектор его не видят.
            </p>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Добавьте заметку для себя: что рассказать, на что обратить внимание..."
              rows={5}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={saveComment}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
                Сохранить комментарий
              </button>
              {commentText && (
                <button onClick={removeComment}
                  className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm text-neutral-600">
                  Очистить
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
