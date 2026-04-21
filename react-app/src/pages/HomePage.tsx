import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Plus, FileText, Search, MoreVertical, Trash2, Settings, Presentation, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { listLectures, getSlideSequence, type LectureListItem } from "../app/api/client";

type LectureWithSlides = LectureListItem & { slideCount?: number };

export function HomePage() {
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<LectureWithSlides[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await listLectures();
        if (cancelled) return;
        setLectures(data);

        // Fetch slide counts in parallel for lectures that have a sequence
        const withCounts = await Promise.all(
          data.map(async (l) => {
            if (!l.sequenceId) return { ...l, slideCount: 0 };
            try {
              const seq = await getSlideSequence(l.sequenceId);
              return { ...l, slideCount: seq.slides?.length ?? 0 };
            } catch {
              return { ...l, slideCount: 0 };
            }
          })
        );
        if (!cancelled) setLectures(withCounts);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Ошибка загрузки");
          setLectures([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = lectures.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );
  const runningCount = lectures.filter((l) => l.status === "ACTIVE").length;
  const draftCount = lectures.filter((l) => l.status === "CREATED").length;
  const finishedCount = lectures.filter((l) => l.status === "STOPPED" || l.status === "FINISHED").length;

  const handleDelete = (id: number) => {
    setLectures((p) => p.filter((l) => l.id !== id));
    setMenuOpen(null);
    toast.success("Лекция удалена из списка");
  };

  const statusLabel = (status: string) => {
    if (status === "ACTIVE") return "Live";
    if (status === "CREATED") return "Черновик";
    if (status === "STOPPED" || status === "FINISHED") return "Завершена";
    return status;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="mb-1">Главная</h1>
          <p className="text-sm text-neutral-500">Управляйте и проводите ваши лекции</p>
        </div>
        <button onClick={() => navigate("/upload/new")}
          className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Новая лекция
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-neutral-200">
          <div className="text-2xl lg:text-3xl mb-1">{lectures.length}</div>
          <div className="text-sm text-neutral-500">Всего лекций</div>
        </div>
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-neutral-200">
          <div className="text-2xl lg:text-3xl mb-1 text-orange-500">{runningCount}</div>
          <div className="text-sm text-neutral-500">Запущено сейчас</div>
        </div>
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-neutral-200">
          <div className="text-2xl lg:text-3xl mb-1">{draftCount}</div>
          <div className="text-sm text-neutral-500">В черновиках</div>
        </div>
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-neutral-200">
          <div className="text-2xl lg:text-3xl mb-1">{finishedCount}</div>
          <div className="text-sm text-neutral-500">Завершено</div>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Не удалось загрузить лекции</p>
            <p className="mt-1 text-red-700/90">{loadError}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск лекций..."
          className="w-full sm:w-80 pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lecture) => (
            <div key={lecture.id} className="bg-white rounded-xl p-5 border border-neutral-200 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h4 className="text-sm truncate">{lecture.name}</h4>
                  {lecture.status === "ACTIVE" && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex-shrink-0">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Live
                    </span>
                  )}
                </div>
                <div className="relative flex-shrink-0">
                  <button onClick={() => setMenuOpen(menuOpen === lecture.id ? null : lecture.id)} className="p-1 hover:bg-neutral-100 rounded">
                    <MoreVertical className="w-4 h-4 text-neutral-400" />
                  </button>
                  {menuOpen === lecture.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 w-48 py-1">
                      <Link to={`/settings/${lecture.id}`} onClick={() => setMenuOpen(null)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-50">
                        <Settings className="w-3.5 h-3.5" /> Настройки
                      </Link>
                      <button onClick={() => handleDelete(lecture.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" /> Удалить
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500 mb-5">
                {lecture.slideCount !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {lecture.slideCount} сл.
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 bg-neutral-100 rounded-full">
                  {statusLabel(lecture.status)}
                </span>
              </div>

              <div className="flex gap-2">
                {lecture.sequenceId ? (
                  <Link to={`/slide-manager/${lecture.id}`}
                    className="flex-1 text-center px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-sm">
                    Слайды
                  </Link>
                ) : (
                  <button disabled
                    className="flex-1 text-center px-3 py-2 border border-neutral-200 rounded-lg text-neutral-400 text-sm cursor-not-allowed">
                    Слайды
                  </button>
                )}
                {lecture.status === "ACTIVE" ? (
                  <Link to={`/live/${lecture.id}`}
                    className="flex-1 text-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-1.5">
                    <Presentation className="w-3.5 h-3.5" /> Перейти
                  </Link>
                ) : (
                  <Link to={`/settings/${lecture.id}`}
                    className="flex-1 text-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
                    Настроить
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && !loadError && (
        <div className="text-center py-16 text-neutral-500">
          {search ? "Ничего не найдено" : "Нет лекций. Создайте первую!"}
        </div>
      )}
    </div>
  );
}