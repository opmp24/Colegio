import { useRef, useEffect, useMemo } from "react";
import gsap from "gsap";
import type { Event, EvaluationType } from "@/types";
import { getContrastText, getContrastBorder } from "@/lib/color";
import { AVATAR_ICONS } from "@/lib/avatar";

interface EventCardProps {
  event: Event;
  courseColor?: string;
  courseName?: string;
  subjectName?: string;
  subjectIcon?: string;
  subjectColor?: string;
  evaluationTypes?: EvaluationType[];
  creatorName?: string;
  creatorIcon?: string;
  creatorColor?: string;
  onClick?: () => void;
}

const typeLabelsRecord = (types?: EvaluationType[]): Record<string, string> => {
  const map: Record<string, string> = {};
  (types ?? []).forEach((t) => { map[t.name] = t.label; });
  return map;
};

export default function EventCard({ event, courseColor, courseName, subjectName, subjectIcon, subjectColor, evaluationTypes, creatorName, creatorIcon, creatorColor, onClick }: EventCardProps) {
  const ref = useRef<HTMLElement>(null);
  const date = new Date(event.due_date);
  const timeStr = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const color = courseColor ?? "#6366f1";
  const typeLabels = useMemo(() => typeLabelsRecord(evaluationTypes), [evaluationTypes]);
  const creatorIconEmoji = useMemo(() => {
    if (!creatorIcon) return undefined;
    const found = AVATAR_ICONS.find((i) => i.id === creatorIcon);
    return found?.emoji;
  }, [creatorIcon]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(ref.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" });
  }, []);

  return (
    <article
      ref={ref}
      className={`bg-white dark:bg-slate-800 rounded-none p-4 shadow-sm border border-gray-200 dark:border-slate-700 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 border" style={{ backgroundColor: subjectColor ?? color, borderColor: getContrastBorder(subjectColor ?? color) }}>
          {subjectIcon ?? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{event.title}</h4>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">{timeStr}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {courseName && (
              <span className={"inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border " + getContrastText(courseColor ?? "#6366f1")} style={{ backgroundColor: courseColor ?? "#6366f1", borderColor: getContrastBorder(courseColor ?? "#6366f1") }}>
                {courseName}
              </span>
            )}
            {subjectName && (
              <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border " + getContrastText(subjectColor ?? "#6366f1")} style={{ backgroundColor: subjectColor ?? "#6366f1", borderColor: getContrastBorder(subjectColor ?? "#6366f1") }}>
                {subjectName}
              </span>
            )}
            <span className={"inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border " + getContrastText(color)} style={{ backgroundColor: color, borderColor: getContrastBorder(color) }}>
              {evaluationTypes ? (typeLabels[event.type] ?? event.type) : event.type}
            </span>
            {event.visibility !== "all" && (
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                Solo profesores
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {date.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </p>
          {creatorName && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500"
                title={`Creado por: ${creatorName}`}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0"
                  style={{ backgroundColor: creatorColor ?? "#6366f1" }}
                >
                  {creatorIconEmoji ?? creatorName.charAt(0).toUpperCase()}
                </span>
                {creatorName}
              </span>
            </div>
          )}
          {event.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>
    </article>
  );
}
