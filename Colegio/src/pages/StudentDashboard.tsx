import { useState, useMemo } from "react";
import { useEvents, useUpcomingEvents } from "@/hooks/useEvents";
import { useUserCourses } from "@/hooks/useUserCourses";
import { useSubjects } from "@/hooks/useSubjects";
import CalendarGrid from "@/components/Calendar/CalendarGrid";
import EventCard from "@/components/EventCard/EventCard";
import type { Subject } from "@/types";

export default function StudentDashboard() {
  const { data: userCourses, isLoading: coursesLoading } = useUserCourses();
  const { data: subjects } = useSubjects();
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  const userCourseIds = useMemo(() => userCourses?.map((c) => c.id) ?? [], [userCourses]);
  const courseIds = selectedCourse === "all" ? userCourseIds : [selectedCourse];
  const { data: events } = useEvents(courseIds.length ? courseIds : undefined);
  const { data: upcoming } = useUpcomingEvents(10, courseIds.length ? courseIds : undefined);

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    (subjects ?? []).forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, { color: string }[]> = {};
    (events ?? []).forEach((ev) => {
      const d = ev.due_date.split("T")[0];
      if (!map[d]) map[d] = [];
      const subject = ev.subject_id ? subjectMap.get(ev.subject_id) : undefined;
      const color = subject?.color ?? ev.courses?.color ?? "#6366f1";
      map[d].push({ color });
    });
    return map;
  }, [events, subjectMap]);

  const selectedDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : "";

  const dayEvents = useMemo(
    () => (events ?? []).filter((ev) => ev.due_date.startsWith(selectedDateStr)),
    [events, selectedDateStr]
  );

  const todayFormatted = today.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (coursesLoading) {
    return (
      <div className="px-4 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!userCourses?.length) {
    return (
      <div className="px-4 py-12 text-center">
        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <h2 className="text-lg font-bold text-slate-600 mb-2">Sin cursos asignados</h2>
        <p className="text-sm text-slate-400">No tienes cursos asignados. Contacta a un administrador.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      {/* Course Selector */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-3 shadow-sm lg:col-span-2">
        <div className="w-2 h-8 rounded-full transition-colors" style={{ backgroundColor: selectedCourse !== "all" ? userCourses?.find((c) => c.id === selectedCourse)?.color ?? "#6366f1" : "#6366f1" }} />
        <div className="flex flex-col flex-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="course-select-student">CURSO</label>
          <select
            id="course-select-student"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="appearance-none bg-transparent border-none p-0 text-lg font-bold text-slate-800 focus:ring-0 cursor-pointer"
          >
            <option value="all">Todos mis cursos</option>
            {userCourses?.map((c) => (
              <option key={c.id} value={c.id}>{c.grade} {c.name} {c.section}</option>
            ))}
          </select>
        </div>
        <svg className="w-4 h-4 text-slate-400 mt-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Calendar */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (month === 0) { setMonth(11); setYear(y => y - 1); }
                else setMonth(m => m - 1);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-slate-800 min-w-[160px] text-center">
              {new Date(year, month).toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
            </h2>
            <button
              onClick={() => {
                if (month === 11) { setMonth(0); setYear(y => y + 1); }
                else setMonth(m => m + 1);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <CalendarGrid
          year={year}
          month={month}
          events={eventsByDate}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </section>

      {/* Day Events */}
      <section className="lg:row-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {selectedDay === today.getDate() ? "ACTIVIDADES DE HOY" : `ACTIVIDADES DEL ${selectedDay}`}
          </h3>
          <span className="text-xs text-primary-600 font-medium">{todayFormatted}</span>
        </div>
        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-400 text-sm">No hay actividades para este día</p>
            </div>
          ) : (
            dayEvents.map((ev) => {
              const subj = ev.subject_id ? subjectMap.get(ev.subject_id) : undefined;
              return (
                <EventCard
                  key={ev.id}
                  event={ev}
                  courseColor={subj?.color ?? ev.courses?.color}
                  courseName={ev.courses ? `${ev.courses.grade} ${ev.courses.name}` : undefined}
                  subjectName={subj?.name}
                  subjectIcon={subj?.icon}
                />
              );
            })
          )}
        </div>
      </section>

      {/* Próximos eventos */}
      {upcoming && upcoming.length > 0 && (
        <section className="bg-white rounded-xl p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">PRÓXIMOS EVENTOS</h3>
            <span className="text-[10px] text-slate-400">{upcoming.length} pendientes</span>
          </div>
          <div className="space-y-3">
            {upcoming.map((ev) => {
              const subj = ev.subject_id ? subjectMap.get(ev.subject_id) : undefined;
              return (
                <EventCard
                  key={ev.id}
                  event={ev}
                  courseColor={subj?.color ?? ev.courses?.color}
                  courseName={ev.courses ? `${ev.courses.grade} ${ev.courses.name}` : undefined}
                  subjectName={subj?.name}
                  subjectIcon={subj?.icon}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
