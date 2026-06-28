import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCourses } from "@/hooks/useCourses";
import { useUserCourses } from "@/hooks/useUserCourses";
import { useSubjects } from "@/hooks/useSubjects";
import { useCreateEvent } from "@/hooks/useEvents";
import { useAuth } from "@/context/AuthContext";

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
  const dateParam = useMemo(() => {
    const d = searchParams.get("date");
    if (!d) return "";
    return d.includes("T") ? d : `${d}T00:00`;
  }, [searchParams]);
  const [form, setForm] = useState({
    title: "",
    course_id: "",
    subject_id: "",
    type: "test" as string,
    description: "",
    due_date: dateParam,
  });

  const availableCourses = profile?.role === "usuario" ? (userCourses ?? []) : (courses ?? []);

  const filteredSubjects = subjects?.filter((s) => !form.course_id || s.course_id === form.course_id) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await createEvent.mutateAsync({
      course_id: form.course_id,
      subject_id: form.subject_id || null,
      title: form.title,
      description: form.description || null,
      type: form.type as any,
      due_date: new Date(form.due_date).toISOString(),
      created_by: profile.id,
    });
    navigate("/");
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Nueva Actividad</h1>
          </div>
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Cerrar">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-5 lg:space-y-0">
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="title">Título de la Actividad</label>
            <input
              id="title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ej. Prueba de Historia: Guerra Fría"
              className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="course">Curso</label>
            <select
              id="course"
              required
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value, subject_id: "" })}
              className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4 appearance-none bg-white"
            >
              <option value="">Selecciona un curso</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.grade} {c.name} {c.section}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="subject">Asignatura</label>
            <select
              id="subject"
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4 appearance-none bg-white"
            >
              <option value="">Sin asignatura</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Evaluación</label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.type === t.value
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="dueDate">Fecha y Hora</label>
            <input
              id="dueDate"
              type="datetime-local"
              required
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="description">Descripción</label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Instrucciones, materiales necesarios, temas a evaluar..."
              rows={3}
              className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 transition-colors py-3 px-4 resize-none"
            />
          </div>

          <div className="pt-4 flex gap-3 lg:col-span-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createEvent.isPending}
              className="flex-1 px-4 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {createEvent.isPending ? "Guardando..." : "Guardar Actividad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
