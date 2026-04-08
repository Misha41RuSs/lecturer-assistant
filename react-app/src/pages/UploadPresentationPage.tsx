import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Upload, FileText, Edit, X, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function UploadPresentationPage() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [lectureName, setLectureName] = useState("");
  const [parsedSlides, setParsedSlides] = useState<number[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedSlides, setSelectedSlides] = useState<Set<number>>(new Set());

  const startUpload = useCallback((name: string) => {
    setUploading(true);
    setFileName(name);
    setParsedSlides([]);
    setUploadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress > 100) progress = 100;
      setUploadProgress(Math.round(progress));

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setUploading(false);
          const slides = Array.from({ length: 8 }, (_, i) => i + 1);
          setParsedSlides(slides);
          setSelectedSlides(new Set(slides));
          toast.success(`${slides.length} слайдов разобрано`);
        }, 400);
      }
    }, 250);
  }, []);

  const handleFileSelect = () => {
    if (!lectureName.trim()) {
      toast.error("Введите название лекции");
      return;
    }
    startUpload("presentation_" + lectureName.replace(/\s/g, "_") + ".pptx");
  };

  const toggleSlide = (id: number) => {
    setSelectedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedSlides.size === 0) {
      toast.error("Выберите хотя бы один слайд");
      return;
    }
    toast.success(`Лекция "${lectureName}" сохранена с ${selectedSlides.size} слайдами`);
    navigate("/settings/1");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="mb-1">Загрузка презентации</h1>
        <p className="text-sm text-neutral-500">Загрузите PowerPoint или PDF для создания новой лекции</p>
      </div>

      {/* Name */}
      <div className="mb-6 max-w-xl">
        <label className="block text-sm mb-2">Название лекции</label>
        <input
          type="text"
          value={lectureName}
          onChange={(e) => setLectureName(e.target.value)}
          placeholder="напр. Введение в машинное обучение"
          className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Upload Area */}
      {parsedSlides.length === 0 && !uploading && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!lectureName.trim()) { toast.error("Сначала введите название"); return; }
            startUpload("uploaded_file.pptx");
          }}
          className={`bg-white rounded-xl p-8 sm:p-12 border-2 border-dashed mb-6 text-center transition-colors ${
            dragOver ? "border-orange-500 bg-orange-50" : "border-neutral-300"
          }`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Upload className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="mb-2">Перетащите файл сюда</h3>
          <p className="text-sm text-neutral-500 mb-6">Поддерживаются PowerPoint (.pptx) и PDF до 100MB</p>
          <button
            onClick={handleFileSelect}
            className="bg-orange-500 text-white px-6 py-2.5 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Выбрать файл
          </button>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="bg-white rounded-xl p-6 border border-neutral-200 mb-6">
          <div className="flex items-center gap-4 mb-3">
            <FileText className="w-5 h-5 text-neutral-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm mb-1 truncate">{fileName}</div>
              <div className="text-xs text-neutral-500">Разбор слайдов...</div>
            </div>
            <div className="text-orange-500 text-sm">{uploadProgress}%</div>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
            <div className="bg-orange-500 h-full transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Parsed Slides */}
      {parsedSlides.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-sm">Разобранные слайды</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSlides(new Set(parsedSlides))}
                className="text-sm text-orange-500 hover:text-orange-600"
              >
                Выбрать все
              </button>
              <button
                onClick={() => setSelectedSlides(new Set())}
                className="text-sm text-neutral-500 hover:text-neutral-700"
              >
                Снять выделение
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-6">
            {parsedSlides.map((slide) => (
              <button
                key={slide}
                onClick={() => toggleSlide(slide)}
                className={`relative aspect-[4/3] bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg overflow-hidden transition-all ${
                  selectedSlides.has(slide) ? "ring-2 ring-orange-500" : "opacity-50"
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-xs">Слайд {slide}</div>
                </div>
                {selectedSlides.has(slide) && (
                  <div className="absolute top-1.5 right-1.5">
                    <CheckCircle className="w-4 h-4 text-orange-500" />
                  </div>
                )}
                <div className="absolute bottom-1.5 left-1.5 text-white text-xs">{slide}</div>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-sm">{selectedSlides.size} из {parsedSlides.length} слайдов выбрано</div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => { setParsedSlides([]); setFileName(""); }}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Подтвердить и сохранить
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
