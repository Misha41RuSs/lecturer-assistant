import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Pencil, Square, Circle, Type, ArrowUpRight, Eraser, Undo2, Trash2, Save, Download, X, Minus } from "lucide-react";
import { toast } from "sonner";

type Tool = "pen" | "rect" | "ellipse" | "arrow" | "text" | "eraser";

interface Point { x: number; y: number; }

interface DrawAction {
  tool: Tool;
  color: string;
  size: number;
  points?: Point[];
  start?: Point;
  end?: Point;
  text?: string;
  position?: Point;
}

interface Props {
  slideIndex: number;
  active: boolean;
  onToggle: () => void;
  onAnnotationsChange?: (slideIndex: number) => void;
  onSave?: (slideIndex: number) => void;
}

export interface DrawingOverlayHandle {
  /** Полный композит слайд+рисунки (для Telegram) */
  getCompositeBlob(slideIndex: number, slideUrl: string): Promise<Blob | null>;
  /** Только слой аннотаций — прозрачный PNG без фона (для проектора) */
  getAnnotationsBlob(slideIndex: number): Promise<Blob | null>;
  hasAnnotations(slideIndex: number): boolean;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff", "#000000"];
const SIZES = [2, 4, 6, 10];

// Standalone render function — used both in canvas and composite export
function renderAction(ctx: CanvasRenderingContext2D, action: DrawAction, w: number, h: number) {
  ctx.strokeStyle = action.color;
  ctx.fillStyle = action.color;
  ctx.lineWidth = action.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if ((action.tool === "pen" || action.tool === "eraser") && action.points && action.points.length > 0) {
    ctx.globalCompositeOperation = action.tool === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();
    const p0 = action.points[0];
    ctx.moveTo(p0.x * w, p0.y * h);
    for (let i = 1; i < action.points.length; i++) {
      ctx.lineTo(action.points[i].x * w, action.points[i].y * h);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }
  if (action.tool === "rect" && action.start && action.end) {
    const s = { x: action.start.x * w, y: action.start.y * h };
    const e = { x: action.end.x * w, y: action.end.y * h };
    ctx.strokeRect(s.x, s.y, e.x - s.x, e.y - s.y);
  }
  if (action.tool === "ellipse" && action.start && action.end) {
    const s = { x: action.start.x * w, y: action.start.y * h };
    const e = { x: action.end.x * w, y: action.end.y * h };
    ctx.beginPath();
    ctx.ellipse((s.x + e.x) / 2, (s.y + e.y) / 2, Math.abs(e.x - s.x) / 2, Math.abs(e.y - s.y) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (action.tool === "arrow" && action.start && action.end) {
    const s = { x: action.start.x * w, y: action.start.y * h };
    const e = { x: action.end.x * w, y: action.end.y * h };
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    const angle = Math.atan2(e.y - s.y, e.x - s.x);
    const headLen = 12 + action.size * 2;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - headLen * Math.cos(angle - Math.PI / 6), e.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - headLen * Math.cos(angle + Math.PI / 6), e.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }
  if (action.tool === "text" && action.text && action.position) {
    const p = { x: action.position.x * w, y: action.position.y * h };
    ctx.font = `${14 + action.size * 3}px sans-serif`;
    ctx.fillText(action.text, p.x, p.y);
  }
}

export const DrawingOverlay = forwardRef<DrawingOverlayHandle, Props>(
  ({ slideIndex, active, onToggle, onAnnotationsChange, onSave }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [tool, setTool] = useState<Tool>("pen");
    const [color, setColor] = useState("#ef4444");
    const [size, setSize] = useState(4);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const [allAnnotations, setAllAnnotations] = useState<Record<number, DrawAction[]>>({});
    const [drawing, setDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [textInput, setTextInput] = useState<{ pos: Point; value: string } | null>(null);

    const annotations = allAnnotations[slideIndex] || [];

    const setAnnotations = useCallback((acts: DrawAction[]) => {
      setAllAnnotations((prev) => ({ ...prev, [slideIndex]: acts }));
    }, [slideIndex]);

    // Fire onAnnotationsChange AFTER React commits the new allAnnotations state
    const prevAnnotationsRef = useRef<Record<number, DrawAction[]>>({});
    useEffect(() => {
      if (prevAnnotationsRef.current[slideIndex] !== allAnnotations[slideIndex]) {
        prevAnnotationsRef.current = { ...prevAnnotationsRef.current, [slideIndex]: allAnnotations[slideIndex] };
        onAnnotationsChange?.(slideIndex);
      }
    }, [allAnnotations, slideIndex, onAnnotationsChange]);

    useImperativeHandle(ref, () => ({
      hasAnnotations(idx: number) {
        return (allAnnotations[idx] || []).length > 0;
      },
      async getAnnotationsBlob(idx: number): Promise<Blob | null> {
        const acts = allAnnotations[idx] || [];
        if (acts.length === 0) return null;
        const canvas = canvasRef.current;
        const w = canvas?.width || 800;
        const h = canvas?.height || 450;
        const offscreen = document.createElement("canvas");
        offscreen.width = w;
        offscreen.height = h;
        const ctx = offscreen.getContext("2d")!;
        for (const action of acts) {
          renderAction(ctx, action, w, h);
        }
        return new Promise(resolve => offscreen.toBlob(b => resolve(b), "image/png"));
      },
      async getCompositeBlob(idx: number, slideUrl: string): Promise<Blob | null> {
        const acts = allAnnotations[idx] || [];
        if (acts.length === 0) return null;

        const canvas = canvasRef.current;
        const w = canvas?.width || 800;
        const h = canvas?.height || 450;

        const composite = document.createElement("canvas");
        composite.width = w;
        composite.height = h;
        const ctx = composite.getContext("2d")!;

        // Load slide image with CORS (добавляем timestamp чтобы не взял из кэша без CORS)
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = slideUrl + (slideUrl.includes("?") ? "&" : "?") + "_cors=1";
          });
          ctx.drawImage(img, 0, 0, w, h);
        } catch {
          // Если CORS не разрешён — рисуем серый фон
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(0, 0, w, h);
        }

        // Накладываем аннотации
        for (const action of acts) {
          renderAction(ctx, action, w, h);
        }

        return new Promise((resolve) => composite.toBlob((b) => resolve(b), "image/png"));
      },
    }), [allAnnotations]);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const action of allAnnotations[slideIndex] || []) {
        renderAction(ctx, action, canvas.width, canvas.height);
      }
    }, [slideIndex, allAnnotations]);

    useEffect(() => {
      const resize = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        redraw();
      };
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slideIndex, allAnnotations]);

    useEffect(() => { redraw(); }, [redraw]);

    const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ("touches" in e) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
      else { clientX = e.clientX; clientY = e.clientY; }
      return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
    };

    const handlePointerDown = (e: React.MouseEvent) => {
      if (!active || textInput) return;
      const pos = getPos(e);
      if (tool === "text") { setTextInput({ pos, value: "" }); return; }
      setDrawing(true);
      if (tool === "pen" || tool === "eraser") setCurrentPoints([pos]);
      else setStartPoint(pos);
    };

    const handlePointerMove = (e: React.MouseEvent) => {
      if (!drawing || !active) return;
      const pos = getPos(e);
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      if (tool === "pen" || tool === "eraser") {
        setCurrentPoints((prev) => [...prev, pos]);
        ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
        const pts = [...currentPoints, pos];
        if (pts.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(pts[pts.length - 2].x * canvas.width, pts[pts.length - 2].y * canvas.height);
          ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      } else if (startPoint) {
        redraw();
        renderAction(ctx, { tool, color, size, start: startPoint, end: pos }, canvas.width, canvas.height);
      }
    };

    const handlePointerUp = () => {
      if (!drawing) return;
      setDrawing(false);
      if (tool === "pen" || tool === "eraser") {
        if (currentPoints.length > 0) setAnnotations([...annotations, { tool, color, size, points: currentPoints }]);
        setCurrentPoints([]);
      } else if (startPoint) setStartPoint(null);
    };

    const handleShapeEnd = (e: React.MouseEvent) => {
      if (!drawing || !startPoint) return;
      setDrawing(false);
      const endPos = getPos(e);
      setAnnotations([...annotations, { tool, color, size, start: startPoint, end: endPos }]);
      setStartPoint(null);
    };

    const handleTextSubmit = () => {
      if (!textInput || !textInput.value.trim()) { setTextInput(null); return; }
      setAnnotations([...annotations, { tool: "text", color, size, text: textInput.value, position: textInput.pos }]);
      setTextInput(null);
    };

    const handleUndo = () => { if (annotations.length > 0) setAnnotations(annotations.slice(0, -1)); };
    const handleClear = () => { if (annotations.length > 0) { setAnnotations([]); toast.success("Рисунки на слайде очищены"); } };

    const handleSaveAnnotations = () => {
      const total = Object.values(allAnnotations).reduce((s, a) => s + a.length, 0);
      if (total === 0) { toast.info("Нет рисунков для сохранения"); return; }
      onSave?.(slideIndex);
    };

    const handleExportSlide = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `slide-${slideIndex + 1}-annotations.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Аннотации слайда скачаны как PNG");
    };

    const tools: { id: Tool; icon: typeof Pencil; label: string }[] = [
      { id: "pen", icon: Pencil, label: "Маркер" },
      { id: "rect", icon: Square, label: "Прямоугольник" },
      { id: "ellipse", icon: Circle, label: "Эллипс" },
      { id: "arrow", icon: ArrowUpRight, label: "Стрелка" },
      { id: "text", icon: Type, label: "Текст" },
      { id: "eraser", icon: Eraser, label: "Ластик" },
    ];

    const hasAnnotations = annotations.length > 0;
    const totalAnnotations = Object.values(allAnnotations).reduce((s, a) => s + a.length, 0);

    return (
      <>
        <div ref={containerRef} className={`absolute inset-0 rounded-lg ${active ? "z-10" : "z-[5] pointer-events-none"}`}>
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${active ? "cursor-crosshair" : ""}`}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={tool === "pen" || tool === "eraser" ? handlePointerUp : handleShapeEnd}
            onMouseLeave={tool === "pen" || tool === "eraser" ? handlePointerUp : handleShapeEnd}
          />
          {textInput && active && (
            <div className="absolute z-20" style={{ left: `${textInput.pos.x * 100}%`, top: `${textInput.pos.y * 100}%` }}>
              <div className="flex gap-1 bg-neutral-900 border border-neutral-700 rounded-lg p-1 shadow-xl">
                <input type="text" autoFocus value={textInput.value}
                  onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); if (e.key === "Escape") setTextInput(null); }}
                  placeholder="Введите текст..."
                  className="px-2 py-1 bg-neutral-800 text-white border border-neutral-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 w-48" />
                <button onClick={handleTextSubmit} className="px-2 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">OK</button>
                <button onClick={() => setTextInput(null)} className="px-1 py-1 text-neutral-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>

        {active && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-neutral-900/95 backdrop-blur border border-neutral-700 rounded-xl p-1.5 shadow-xl">
            {tools.map((t) => (
              <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                className={`p-2 rounded-lg transition-colors ${tool === t.id ? "bg-orange-500 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"}`}>
                <t.icon className="w-4 h-4" />
              </button>
            ))}
            <div className="w-px h-6 bg-neutral-700 mx-1" />
            <div className="relative">
              <button onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-7 h-7 rounded-lg border-2 border-neutral-600 hover:border-neutral-400 transition-colors"
                style={{ backgroundColor: color }} title="Цвет" />
              {showColorPicker && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700 rounded-xl p-2 shadow-xl grid grid-cols-5 gap-1.5">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => { setColor(c); setShowColorPicker(false); }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-orange-500 scale-110" : "border-neutral-600"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5 ml-1">
              {SIZES.map((s) => (
                <button key={s} onClick={() => setSize(s)} title={`Размер ${s}`}
                  className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${size === s ? "bg-neutral-700" : "hover:bg-neutral-800"}`}>
                  <div className="rounded-full bg-white" style={{ width: s + 2, height: s + 2 }} />
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-neutral-700 mx-1" />
            <button onClick={handleUndo} disabled={!hasAnnotations} title="Отменить"
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={handleClear} disabled={!hasAnnotations} title="Очистить слайд"
              className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {(active || totalAnnotations > 0) && (
          <div className="relative z-30 flex items-center justify-between mt-2 gap-2">
            <div className="text-neutral-500 text-xs">
              {hasAnnotations ? `${annotations.length} элементов на слайде` : "Рисуйте прямо поверх слайда"}
              {totalAnnotations > 0 && ` · ${totalAnnotations} всего`}
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportSlide} disabled={!hasAnnotations}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-xs hover:bg-neutral-700 disabled:opacity-30">
                <Download className="w-3.5 h-3.5" /> Экспорт слайда
              </button>
              <button onClick={handleSaveAnnotations} disabled={totalAnnotations === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs hover:bg-orange-600 disabled:opacity-30">
                <Save className="w-3.5 h-3.5" /> Сохранить для студентов
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
);

DrawingOverlay.displayName = "DrawingOverlay";