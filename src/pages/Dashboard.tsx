import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents, useUpcomingEvents } from "@/hooks/useEvents";
import { useCourses } from "@/hooks/useCourses";
import { useUserCourses } from "@/hooks/useUserCourses";
import { useSubjects } from "@/hooks/useSubjects";
import { useEvaluationTypes } from "@/hooks/useEvaluationTypes";
import { useAuth } from "@/context/AuthContext";
import CalendarGrid from "@/components/Calendar/CalendarGrid";
import EventCard from "@/components/EventCard/EventCard";
import EventDetailModal from "@/components/EventDetailModal/EventDetailModal";
import gsap from "gsap";
import type { Subject, Event } from "@/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: allCourses, isLoading: allCoursesLoading } = useCourses();
  const { data: userCourses, isLoading: userCoursesLoading } = useUserCourses();
  const { data: subjects } = useSubjects();
  const { data: evaluationTypes } = useEvaluationTypes();
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  const isTeacher = profile?.role === "admin" || profile?.role === "profesor";
  const courses = isTeacher ? allCourses : userCourses;
  const isLoading = isTeacher ? allCoursesLoading : userCoursesLoading;

  const courseIds = selectedCourse === "all"
    ? (courses?.map((c) => c.id) ?? [])
    : [selectedCourse];

  const { data: events } = useEvents(courseIds);
  const { data: upcoming } = useUpcomingEvents(isTeacher ? 5 : 10, courseIds);

  const today = useMemo(() => new Date(), []);
  const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(fmtDate(today));
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const touchStartX = useRef(0);

  const weekStart = useMemo(() => {
    if (viewMode !== "week") return today;
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }, [viewMode, selectedDate]);

  const goToPrev = () => {
    if (viewMode === "week") {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7);
      setSelectedDate(fmtDate(d));
    } else {
      if (month === 0) { setMonth(11); setYear(y => y - 1); }
      else setMonth(m => m - 1);
    }
  };

  const goToNext = () => {
    if (viewMode === "week") {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      setSelectedDate(fmtDate(d));
    } else {
      if (month === 11) { setMonth(0); setYear(y => y + 1); }
      else setMonth(m => m + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) goToPrev();
      else goToNext();
    }
  };

  const todayStr = fmtDate(today);
  const isTodaySelected = selectedDate === todayStr;

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

  const dayEvents = useMemo(
    () => (events ?? []).filter((ev) => ev.due_date.startsWith(selectedDate)),
    [events, selectedDate]
  );

  const todayFormatted = today.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sections = containerRef.current?.querySelectorAll("section");
    if (sections) {
      gsap.fromTo(sections, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" });
    }
  }, []);

  const canCreate = profile?.role !== "usuario" || profile?.permissions?.includes("eventos");

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    if (isTeacher) {
      return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No hay cursos aún</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Crea tu primer curso para empezar a gestionar actividades.</p>
          <a
            href="/cursos"
            className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
          >
            Ir a Gestión de Cursos
          </a>
        </div>
      );
    }
    return (
      <div className="px-4 py-12 text-center">
        <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <h2 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">Sin cursos asignados</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">No tienes cursos asignados. Contacta a un administrador.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="px-4 py-4 space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      {/* Course Selector */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm dark:shadow-slate-900/50 lg:col-span-2">
        <div className="w-2 h-8 rounded-full transition-colors" style={{ backgroundColor: selectedCourse !== "all" ? courses.find((c) => c.id === selectedCourse)?.color ?? "#6366f1" : "#6366f1" }} />
        <div className="flex flex-col flex-1">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider" htmlFor="course-select">CURSO</label>
          <select
            id="course-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="appearance-none bg-transparent border-none p-0 text-lg font-bold text-slate-800 dark:text-slate-100 focus:ring-0 cursor-pointer"
          >
            <option value="all">{isTeacher ? "Todos los cursos" : "Todos mis cursos"}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.grade} {c.name} {c.section}</option>
            ))}
          </select>
        </div>
        <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Calendar */}
      <section
        className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={goToPrev} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 min-w-[160px] text-center">
              {viewMode === "week"
                ? `${weekStart.toLocaleDateString("es-CL", { day: "numeric", month: "short" })} - ${new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}`
                : new Date(year, month).toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
            </h2>
            <button onClick={goToNext} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { const t = new Date(); setYear(t.getFullYear()); setMonth(t.getMonth()); setSelectedDate(fmtDate(t)); setViewMode("month"); }}
              className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {viewMode === "month" ? "Semana" : "Mes"}
            </button>
          </div>
        </div>
        <CalendarGrid
          year={year}
          month={month}
          view={viewMode}
          weekStart={weekStart}
          events={eventsByDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </section>

      {/* Day Events */}
      <section className="lg:row-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {isTodaySelected ? "AGENDA DE HOY" : `EVENTOS DEL ${selectedDate.split("-").pop()}`}
          </h3>
          <span className="text-xs text-primary-600 dark:text-primary-400 font-medium capitalize">{todayFormatted}</span>
        </div>
        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm dark:shadow-slate-900/50 text-center">
              <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">No hay actividades para este día</p>
              {canCreate && (
                <button
                  onClick={() => navigate(`/crear?date=${selectedDate}`)}
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
                const creator = (ev as any).creator;
                return (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    courseColor={ev.courses?.color}
                    courseName={ev.courses ? `${ev.courses.grade} ${ev.courses.name}` : undefined}
                    subjectName={subj?.name}
                    subjectIcon={subj?.icon}
                    subjectColor={subj?.color}
                    evaluationTypes={evaluationTypes}
                    creatorName={creator?.full_name}
                    creatorIcon={creator?.avatar_icon}
                    creatorColor={creator?.avatar_color}
                    onClick={() => setSelectedEvent(ev)}
                  />
                );
              })}
              {canCreate && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => navigate(`/crear?date=${selectedDate}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-100 dark:shadow-primary-900/30 transition-all active:scale-95"
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
        <section className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">PRÓXIMOS EVENTOS</h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{upcoming.length} pendientes</span>
          </div>
          <div className="space-y-3">
            {upcoming.map((ev) => {
              const subj = ev.subject_id ? subjectMap.get(ev.subject_id) : undefined;
              const creator = (ev as any).creator;
              return (
                <EventCard
                  key={ev.id}
                  event={ev}
                  courseColor={ev.courses?.color}
                  courseName={ev.courses ? `${ev.courses.grade} ${ev.courses.name}` : undefined}
                  subjectName={subj?.name}
                  subjectIcon={subj?.icon}
                  subjectColor={subj?.color}
                  evaluationTypes={evaluationTypes}
                  creatorName={creator?.full_name}
                  creatorIcon={creator?.avatar_icon}
                  creatorColor={creator?.avatar_color}
                  onClick={() => setSelectedEvent(ev)}
                />
              );
            })}
          </div>
        </section>
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          courseColor={selectedEvent.courses?.color}
          courseName={selectedEvent.courses ? `${selectedEvent.courses.grade} ${selectedEvent.courses.name}` : undefined}
          subjectName={(() => { const subj = selectedEvent.subject_id ? subjectMap.get(selectedEvent.subject_id) : undefined; return subj?.name; })()}
          subjectIcon={(() => { const subj = selectedEvent.subject_id ? subjectMap.get(selectedEvent.subject_id) : undefined; return subj?.icon; })()}
          subjectColor={(() => { const subj = selectedEvent.subject_id ? subjectMap.get(selectedEvent.subject_id) : undefined; return subj?.color; })()}
          creatorName={(selectedEvent as any).creator?.full_name}
          creatorIcon={(selectedEvent as any).creator?.avatar_icon}
          creatorColor={(selectedEvent as any).creator?.avatar_color}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
