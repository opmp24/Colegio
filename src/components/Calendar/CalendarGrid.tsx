import { useMemo } from "react";

interface CalendarGridProps {
  year: number;
  month: number;
  view: "month" | "week";
  weekStart?: Date;
  events: Record<string, { color: string }[]>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const DAYS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

function fmt(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarGrid({ year, month, view, weekStart, events, selectedDate, onSelectDate }: CalendarGridProps) {
  const days = useMemo(() => {
    if (view === "week" && weekStart) {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return { day: d.getDate(), dateKey: fmt(d.getFullYear(), d.getMonth(), d.getDate()) };
      });
    }
    const totalDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => ({
      day: i + 1,
      dateKey: fmt(year, month, i + 1),
    }));
  }, [view, weekStart, year, month]);

  const pad = useMemo(() => {
    if (view === "week") return [];
    return Array.from({ length: new Date(year, month, 1).getDay() }, () => null);
  }, [view, year, month]);

  return (
    <div>
      <div className="grid grid-cols-7 text-center mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {pad.map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(({ day, dateKey }) => {
          const dayEvents = events[dateKey] ?? [];
          const isSelected = selectedDate === dateKey;
          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`h-10 flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative ${
                isSelected ? "bg-primary-600 text-white font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <span>{day}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span key={i} className="w-2 h-2 rounded" style={{ backgroundColor: e.color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
