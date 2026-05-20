import { useState } from "react";
import { Users, BarChart2, CheckCircle2, XCircle, AlertCircle, TrendingUp } from "lucide-react";

// ─── Types (mirror backend ExamAnalyticsDto) ────────────────────────────────
export interface OptionStat {
  optionId: string;
  optionText: string;
  correct: boolean;
  chosenCount: number;
  chosenPct: number;
}

export interface QuestionStat {
  questionId: string;
  orderIndex: number;
  questionText: string;
  questionType: "MULTIPLE" | "OPEN";
  totalAnswers: number;
  correctAnswers: number;
  correctPct: number;
  optionStats: OptionStat[];
}

export interface StudentStat {
  chatId: number;
  totalScore: number;
  maxScore: number;
  correctPct: number;
  correctAnswers: number;
  totalMultiple: number;
  hasUngraded: boolean;
}

export interface ExamAnalytics {
  examId: string;
  examTitle: string;
  totalSubmissions: number;
  questionStats: QuestionStat[];
  studentStats: StudentStat[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function pctColor(pct: number) {
  if (pct >= 70) return "text-green-600";
  if (pct >= 40) return "text-yellow-600";
  return "text-red-500";
}

function pctBarColor(pct: number) {
  if (pct >= 70) return "bg-green-500";
  if (pct >= 40) return "bg-yellow-400";
  return "bg-red-400";
}

function ScoreBadge({ pct, hasUngraded }: { pct: number; hasUngraded: boolean }) {
  if (hasUngraded)
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
        <AlertCircle className="w-3 h-3" />
        На проверке
      </span>
    );
  if (pct >= 70)
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" />
        Сдал
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
      <XCircle className="w-3 h-3" />
      Не сдал
    </span>
  );
}

// ─── Question Analytics Panel ────────────────────────────────────────────────
function QuestionAnalytics({ questions }: { questions: QuestionStat[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (questions.length === 0)
    return (
      <div className="bg-white rounded-xl p-8 border border-neutral-200 text-center text-neutral-400 text-sm">
        Нет данных по вопросам
      </div>
    );

  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const isOpen = q.questionType === "OPEN";
        const isExpanded = expanded === q.questionId;

        return (
          <div
            key={q.questionId}
            className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
          >
            {/* Header row */}
            <button
              onClick={() => setExpanded(isExpanded ? null : q.questionId)}
              className="w-full flex items-start gap-3 p-4 hover:bg-neutral-50 transition-colors text-left"
            >
              {/* Question number */}
              <div className="w-7 h-7 bg-orange-500 text-white rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug mb-2 line-clamp-2">{q.questionText}</p>

                {/* Progress bar + pct */}
                {!isOpen ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pctBarColor(q.correctPct)}`}
                        style={{ width: `${q.correctPct}%` }}
                      />
                    </div>
                    <span className={`text-sm tabular-nums font-medium flex-shrink-0 ${pctColor(q.correctPct)}`}>
                      {q.correctPct}%
                    </span>
                    <span className="text-xs text-neutral-400 flex-shrink-0">
                      {q.correctAnswers}/{q.totalAnswers} правильных
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">
                    Открытый ответ · {q.totalAnswers} ответов
                  </span>
                )}
              </div>

              {/* Expand chevron (only for MULTIPLE with options) */}
              {!isOpen && q.optionStats.length > 0 && (
                <svg
                  className={`w-4 h-4 text-neutral-400 flex-shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </button>

            {/* Option distribution (expandable) */}
            {isExpanded && !isOpen && q.optionStats.length > 0 && (
              <div className="border-t border-neutral-100 px-4 pb-4 pt-3 space-y-2">
                <p className="text-xs text-neutral-500 mb-3">Распределение ответов:</p>
                {q.optionStats.map((opt) => (
                  <div key={opt.optionId} className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        opt.correct
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-neutral-300"
                      }`}
                    >
                      {opt.correct && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs flex-shrink-0 w-36 truncate ${opt.correct ? "text-green-700 font-medium" : "text-neutral-600"}`}>
                      {opt.optionText}
                    </span>
                    <div className="flex-1 bg-neutral-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${opt.correct ? "bg-green-400" : "bg-neutral-300"}`}
                        style={{ width: `${opt.chosenPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-neutral-500 w-16 text-right flex-shrink-0 tabular-nums">
                      {opt.chosenCount} ({opt.chosenPct}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Student Stats Table ─────────────────────────────────────────────────────
function StudentStatsTable({
  students,
  onStudentClick,
}: {
  students: StudentStat[];
  onStudentClick?: (chatId: number) => void;
}) {
  const [sortKey, setSortKey] = useState<"score" | "pct" | "chatId">("score");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...students].sort((a, b) => {
    let delta = 0;
    if (sortKey === "score") delta = (a.maxScore > 0 ? a.totalScore / a.maxScore : 0) - (b.maxScore > 0 ? b.totalScore / b.maxScore : 0);
    if (sortKey === "pct") delta = a.correctPct - b.correctPct;
    if (sortKey === "chatId") delta = a.chatId - b.chatId;
    return sortAsc ? delta : -delta;
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) =>
    sortKey === col ? (
      <svg className={`w-3 h-3 inline ml-0.5 ${sortAsc ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    ) : null;

  if (students.length === 0)
    return (
      <div className="bg-white rounded-xl p-8 border border-neutral-200 text-center text-neutral-400 text-sm">
        Тест ещё никто не проходил
      </div>
    );

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th
                onClick={() => toggleSort("chatId")}
                className="text-left py-3 px-4 text-xs text-neutral-500 font-medium cursor-pointer hover:text-neutral-800 select-none"
              >
                Студент <SortIcon col="chatId" />
              </th>
              <th
                onClick={() => toggleSort("score")}
                className="text-left py-3 px-4 text-xs text-neutral-500 font-medium cursor-pointer hover:text-neutral-800 select-none"
              >
                Балл <SortIcon col="score" />
              </th>
              <th
                onClick={() => toggleSort("pct")}
                className="text-left py-3 px-4 text-xs text-neutral-500 font-medium cursor-pointer hover:text-neutral-800 select-none"
              >
                % правильных <SortIcon col="pct" />
              </th>
              <th className="text-left py-3 px-4 text-xs text-neutral-500 font-medium">Прогресс</th>
              <th className="text-left py-3 px-4 text-xs text-neutral-500 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const scorePct = s.maxScore > 0 ? Math.round((s.totalScore / s.maxScore) * 100) : 0;
              return (
                <tr
                  key={s.chatId}
                  onClick={() => onStudentClick?.(s.chatId)}
                  className={`border-b border-neutral-100 transition-colors ${
                    onStudentClick ? "cursor-pointer hover:bg-orange-50" : ""
                  } ${i % 2 === 0 ? "" : "bg-neutral-50/50"}`}
                >
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-xs flex items-center justify-center font-medium flex-shrink-0">
                        {String(s.chatId).slice(-2)}
                      </div>
                      <span className="text-neutral-700">#{s.chatId}</span>
                      {s.hasUngraded && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm tabular-nums font-medium text-neutral-800">
                    {s.totalScore}
                    <span className="text-neutral-400 font-normal">/{s.maxScore}</span>
                  </td>
                  <td className="py-3 px-4">
                    {s.totalMultiple > 0 ? (
                      <span className={`text-sm tabular-nums font-medium ${pctColor(s.correctPct)}`}>
                        {s.correctPct}%
                        <span className="text-neutral-400 font-normal text-xs ml-1">
                          ({s.correctAnswers}/{s.totalMultiple})
                        </span>
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-24 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pctBarColor(scorePct)}`}
                        style={{ width: `${scorePct}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <ScoreBadge pct={scorePct} hasUngraded={s.hasUngraded} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main StatsPanel ─────────────────────────────────────────────────────────
interface StatsPanelProps {
  analytics: ExamAnalytics;
  onStudentClick?: (chatId: number) => void;
}

export function StatsPanel({ analytics, onStudentClick }: StatsPanelProps) {
  const [activeTab, setActiveTab] = useState<"questions" | "students">("questions");

  const { questionStats, studentStats } = analytics;

  // Summary metrics
  const avgCorrectPct =
    questionStats.filter((q) => q.questionType === "MULTIPLE").length > 0
      ? Math.round(
          questionStats
            .filter((q) => q.questionType === "MULTIPLE")
            .reduce((s, q) => s + q.correctPct, 0) /
            questionStats.filter((q) => q.questionType === "MULTIPLE").length
        )
      : null;

  const hardestQ = questionStats
    .filter((q) => q.questionType === "MULTIPLE" && q.totalAnswers > 0)
    .sort((a, b) => a.correctPct - b.correctPct)[0];

  const easiestQ = questionStats
    .filter((q) => q.questionType === "MULTIPLE" && q.totalAnswers > 0)
    .sort((a, b) => b.correctPct - a.correctPct)[0];

  const passed = studentStats.filter(
    (s) => !s.hasUngraded && s.maxScore > 0 && s.totalScore >= s.maxScore * 0.7
  ).length;

  return (
    <div className="space-y-5">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-neutral-500">Прошли тест</span>
          </div>
          <div className="text-2xl font-semibold">{analytics.totalSubmissions}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-neutral-500">Сдали (≥70%)</span>
          </div>
          <div className="text-2xl font-semibold text-green-600">{passed}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-neutral-500">Средний % правильных</span>
          </div>
          <div className={`text-2xl font-semibold ${avgCorrectPct !== null ? pctColor(avgCorrectPct) : ""}`}>
            {avgCorrectPct !== null ? `${avgCorrectPct}%` : "—"}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-neutral-500">Вопросов</span>
          </div>
          <div className="text-2xl font-semibold">{questionStats.length}</div>
        </div>
      </div>

      {/* Hardest / Easiest insight cards */}
      {(hardestQ || easiestQ) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hardestQ && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-rose-500 font-semibold uppercase tracking-wide mb-1">Самый сложный вопрос</p>
              <p className="text-sm text-neutral-800 font-medium line-clamp-2">{hardestQ.questionText}</p>
              <p className="text-xs text-rose-500 mt-1">{hardestQ.correctPct}% правильных ответов</p>
            </div>
          )}
          {easiestQ && easiestQ.questionId !== hardestQ?.questionId && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">Самый лёгкий вопрос</p>
              <p className="text-sm text-neutral-800 font-medium line-clamp-2">{easiestQ.questionText}</p>
              <p className="text-xs text-emerald-600 mt-1">{easiestQ.correctPct}% правильных ответов</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("questions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === "questions"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          По вопросам
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === "students"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          По студентам
          {studentStats.length > 0 && (
            <span className="bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {studentStats.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab content ── */}
      {activeTab === "questions" && <QuestionAnalytics questions={questionStats} />}
      {activeTab === "students" && (
        <StudentStatsTable students={studentStats} onStudentClick={onStudentClick} />
      )}
    </div>
  );
}
