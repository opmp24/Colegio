import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { getContrastText, getContrastBorder } from "@/lib/color";
import { AVATAR_ICONS } from "@/lib/avatar";
import BackToSettings from "@/components/BackToSettings/BackToSettings";
import type { Event } from "@/types";

export default function ActivityLogPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => {
      const { data, error } = await db
        .from("events")
        .select("*, courses:course_id(*), creator:created_by(full_name, avatar_icon, avatar_color)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Event & { courses?: { grade: string; name: string; color: string } | null })[];
    },
  });

  return (
    <div className="px-4 py-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Log de Actividades</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Registro de creación de actividades, ordenado de más reciente a más antiguo.
      </p>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando actividades...</div>
      ) : (
        <div className="space-y-2">
          {events?.length === 0 && (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
              No hay actividades registradas.
            </p>
          )}
          {events?.map((event) => {
            const course = event.courses;
            const creator = event.creator;
            const creatorEmoji = creator
              ? (AVATAR_ICONS.find((i) => i.id === creator.avatar_icon)?.emoji ?? creator.full_name.charAt(0).toUpperCase())
              : "?";
            const createdDate = new Date(event.created_at);
            const dateStr = createdDate.toLocaleDateString("es-CL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            const timeStr = createdDate.toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={event.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                      {event.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {course && (
                        <span
                          className={"inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border " + getContrastText(course.color ?? "#6366f1")}
                          style={{ backgroundColor: course.color ?? "#6366f1", borderColor: getContrastBorder(course.color ?? "#6366f1") }}
                        >
                          {course.grade} {course.name}
                        </span>
                      )}
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                      >
                        {event.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 dark:text-slate-500">
                      {creator && (
                        <span className="flex items-center gap-1">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: creator.avatar_color ?? "#6366f1" }}
                          >
                            {creatorEmoji}
                          </span>
                          {creator.full_name}
                        </span>
                      )}
                      <span>&middot;</span>
                      <span>{dateStr} a las {timeStr}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BackToSettings />
    </div>
  );
}
