import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents, useUpcomingEvents } from "@/hooks/useEvents";
import { useCourses } from "@/hooks/useCourses";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import CalendarGrid from "@/components/Calendar/CalendarGrid";
import EventCard from "@/components/EventCard/EventCard";
import type { Subject } from "@/types";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: courses } = useCourses();
  const { data: subjects } = useSubjects();
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const courseId = selectedCourse === "all" ? undefined : selectedCourse;
  const { data: events } = useEvents(courseId);
  const { data: upcoming } = useUpcomingEvents(5);

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
      const color = subject?.color ?? courses?.find((c) => c.id === ev.course_id)?.color ?? "#6366f1";
      map[d].push({ color });
    });
    return map;
  }, [events, courses, subjectMap]);

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
  });

  const canCreate = profile?.role !== "usuario";

  return (
    <div className="px-4 py-4 space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      {/* Course Selector */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-3 shadow-sm lg:col-span-2">
        <div className="w-2 h-8 rounded-full transition-colors" style={{ backgroundColor: selectedCourse !== "all" ? courses?.find((c) => c.id === selectedCourse)?.color ?? "#6366f1" : "#6366f1" }} />
        <div className="flex flex-col flex-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="course-select">CURSO</label>
          <select
            id="course-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="appearance-none bg-transparent border-none p-0 text-lg font-bold text-slate-800 focus:ring-0 cursor-pointer"
          >
            <option value="all">Todos los cursos</option>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>{c.grade} {c.name} {c.section}</option>
            ))}
          </select>
        </div>
        <svg className="w-4 h-4 text-slate-400 mt-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Calendar */}
      <section className="bg-white rounded-xl p-4 shadow-sm min-h-[40dvh] lg:min-h-0">
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
            {selectedDay === today.getDate() ? "AGENDA DE HOY" : `EVENTOS DEL ${selectedDay}`}
          </h3>
          <span className="text-xs text-primary-600 font-medium capitalize">{todayFormatted}</span>
        </div>
        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-400 text-sm mb-4">No hay actividades para este día</p>
              {canCreate && (
                <button
                  onClick={() => navigate(`/crear?date=${selectedDateStr}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear actividad
                </button>
              )}
            </div>
          ) : (
            <>
              {dayEvents.map((ev) => {
                const subj = ev.subject_id ? subjectMap.get(ev.subject_id) : undefined;
                return (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    courseColor={subj?.color ?? courses?.find((c) => c.id === ev.course_id)?.color}
                    courseName={courses?.find((c) => c.id === ev.course_id)?.name}
                    subjectName={subj?.name}
                    subjectIcon={subj?.icon}
                  />
                );
              })}
              {canCreate && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => navigate(`/crear?date=${selectedDateStr}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Próximos eventos */}
      {upcoming && upcoming.length > 0 && (
        <section className="bg-white rounded-xl p-4 shadow-sm lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">PRÓXIMOS EVENTOS</h3>
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
