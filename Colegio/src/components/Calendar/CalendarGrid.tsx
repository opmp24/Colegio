import { useMemo } from "react";

interface CalendarGridProps {
  year: number;
  month: number;
  events: Record<string, { color: string }[]>;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
}

const DAYS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

export default function CalendarGrid({ year, month, events, selectedDay, onSelectDay }: CalendarGridProps) {
  const days = useMemo(() => {
    const totalDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [year, month]);

  const pad = useMemo(() => Array.from({ length: new Date(year, month, 1).getDay() }, () => null), [year, month]);

  return (
    <div>
      <div className="grid grid-cols-7 text-center mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {pad.map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((day) => {
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = events[key] ?? [];
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              className={`h-10 flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative ${
                isSelected ? "bg-primary-600 text-white font-bold" : "hover:bg-slate-100"
              }`}
            >
              <span>{day}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: e.color }} />
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


