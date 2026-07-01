import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCourses } from "@/hooks/useCourses";
import { useUserCourses } from "@/hooks/useUserCourses";
import { useSubjects } from "@/hooks/useSubjects";
import { useCreateEvent } from "@/hooks/useEvents";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/useToast";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventSchema, type EventFormValues } from "@/lib/eventSchema";

const eventTypes = [
  { value: "test", label: "Prueba" },
  { value: "exam", label: "Examen" },
  { value: "homework", label: "Trabajo" },
  { value: "essay", label: "Ensayo" },
  { value: "other", label: "Otros" },
] as const;

export default function CreateEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { data: courses } = useCourses();
  const { data: userCourses } = useUserCourses();
  const { data: subjects } = useSubjects();
  const createEvent = useCreateEvent();
  const toast = useToast();
  const dateParam = useMemo(() => {
    const d = searchParams.get("date");
    if (!d) return "";
    return d.includes("T") ? d : `${d}T00:00`;
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      course_id: "",
      subject_id: "",
      type: "test",
      description: "",
      due_date: dateParam,
    },
  });

  // Reset subject when course changes
  useEffect(() => {
    setValue("subject_id", "");
  }, [watch("course_id"), setValue]);

  const availableCourses = profile?.role === "usuario" ? (userCourses ?? []) : (courses ?? []);

  const filteredSubjects = subjects?.filter((s) => !watch("course_id") || s.course_id === watch("course_id")) ?? [];

  const onSubmit: SubmitHandler<EventFormValues> = async (data) => {
    try {
      await createEvent.mutateAsync({
        course_id: data.course_id,
        subject_id: data.subject_id,
        title: data.title,
        description: data.description,
        type: data.type,
        due_date: new Date(data.due_date).toISOString(),
        created_by: profile?.id ?? "",
      });
      toast.success("Actividad creada correctamente");
      reset();
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear actividad");
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Nueva Actividad</h1>
          </div>
          <button onClick={() => navigate(-1)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1" aria-label="Cerrar">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-5 lg:space-y-0">
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1" htmlFor="title">Título de la Actividad</label>
            <input
              id="title"
              {...register("title")}
              placeholder="ej. Prueba de Historia: Guerra Fría"
              className={`w-full rounded-xl border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4 ${
                errors.title ? "border-red-500" : ""
              }`}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1" htmlFor="course">Curso</label>
            <select
              id="course"
              {...register("course_id", { required: "Curso es requerido" })}
              className={`w-full rounded-xl border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4 appearance-none ${
                errors.course_id ? "border-red-500" : ""
              }`}
            >
              <option value="">Selecciona un curso</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade} {c.name} {c.section}
                </option>
              ))}
            </select>
            {errors.course_id && (
              <p className="text-xs text-red-500 mt-1">{errors.course_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1" htmlFor="subject">Asignatura</label>
            <select
              id="subject"
              {...register("subject_id")}
              className={`w-full rounded-xl border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4 appearance-none ${
                errors.subject_id ? "border-red-500" : ""
              }`}
            >
              <option value="">Sin asignatura</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
            {errors.subject_id && (
              <p className="text-xs text-red-500 mt-1">{errors.subject_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1">Tipo de Evaluación</label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setValue("type", t.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    watch("type") === t.value
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1" htmlFor="dueDate">Fecha y Hora</label>
            <input
              id="dueDate"
              type="datetime-local"
              {...register("due_date", { required: "Fecha y hora son requeridas" })}
              value={watch("due_date") ?? ""}
              onChange={(e) => setValue("due_date", e.target.value)}
              className={`w-full rounded-xl border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4 ${
                errors.due_date ? "border-red-500" : ""
              }`}
            />
            {errors.due_date && (
              <p className="text-xs text-red-500 mt-1">{errors.due_date.message}</p>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1" htmlFor="description">Descripción</label>
            <textarea
              id="description"
              {...register("description")}
              placeholder="Instrucciones, materiales necesarios, temas a evaluar..."
              rows={3}
              className={`w-full rounded-xl border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4 resize-none ${
                errors.description ? "border-red-500" : ""
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="pt-4 flex gap-3 lg:col-span-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                isSubmitting ? "opacity-50" : ""
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-100 dark:shadow-primary-900/30 transition-all active:scale-95 ${
                isSubmitting ? "opacity-50" : ""
              }`}
            >
              {isSubmitting ? "Guardando..." : "Guardar Actividad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}