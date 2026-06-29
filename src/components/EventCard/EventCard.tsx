import type { Event } from "@/types";

interface EventCardProps {
  event: Event;
  courseColor?: string;
  courseName?: string;
  subjectName?: string;
  subjectIcon?: string;
}

const typeLabels: Record<string, string> = {
  test: "Prueba",
  exam: "Examen",
  homework: "Trabajo",
  essay: "Ensayos",
  other: "Otros",
};

export default function EventCard({ event, courseColor, courseName, subjectName, subjectIcon }: EventCardProps) {
  const date = new Date(event.due_date);
  const timeStr = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const color = courseColor ?? "#6366f1";

  return (
    <article className="bg-white rounded-xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex justify-between items-start mb-1">
        <div>
          {(subjectName || courseName) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase bg-slate-50 px-2 py-0.5 rounded">
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
          <h4 className="text-base font-bold text-slate-800 mt-1">{event.title}</h4>
        </div>
        <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">{timeStr}</span>
      </div>
      {event.description && (
        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{event.description}</p>
      )}
    </article>
  );
}
