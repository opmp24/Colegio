import { useRef, useEffect } from "react";
import gsap from "gsap";
import type { Event } from "@/types";

interface EventCardProps {
  event: Event;
  courseColor?: string;
  courseName?: string;
  subjectName?: string;
  subjectIcon?: string;
  onClick?: () => void;
}

const typeLabels: Record<string, string> = {
  test: "Prueba",
  exam: "Examen",
  homework: "Trabajo",
  essay: "Ensayos",
  other: "Otros",
};

export default function EventCard({ event, courseColor, courseName, subjectName, subjectIcon, onClick }: EventCardProps) {
  const ref = useRef<HTMLElement>(null);
  const date = new Date(event.due_date);
  const timeStr = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const color = courseColor ?? "#6366f1";

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(ref.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" });
  }, []);

  return (
    <article
      ref={ref}
      className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-slate-700 border-l-4 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      style={{ borderLeftColor: color }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          {(subjectName || courseName) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded">
              {courseName && <span>{courseName}</span>}
              {courseName && subjectName && <span>·</span>}
              {subjectIcon && <span>{subjectIcon}</span>}
              {subjectName ?? typeLabels[event.type] ?? event.type}
            </span>
          )}
          {!subjectName && !courseName && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{
              color,
              backgroundColor: `${color}15`,
            }}>{typeLabels[event.type] ?? event.type}</span>
          )}
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">{event.title}</h4>
        </div>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">{timeStr}</span>
      </div>
      {event.description && (
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{event.description}</p>
      )}
    </article>
  );
}
