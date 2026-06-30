import { useState } from "react";
import { useCourses } from "@/hooks/useCourses";
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject } from "@/hooks/useSubjects";
import type { Subject } from "@/types";

const EMOJIS = ["📚", "📐", "🔬", "🌍", "📖", "🎨", "🎵", "⚽", "💻", "🧮", "🔤", "🧪", "📜", "🗣️", "🧠"];

export default function SubjectsPage() {
  const { data: courses } = useCourses();
  const { data: subjects, isLoading } = useSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ course_id: "", name: "", profesor_name: "", color: "#6366f1", icon: "📚" });

  const resetForm = () => {
    setForm({ course_id: "", name: "", profesor_name: "", color: "#6366f1", icon: "📚" });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updateSubject.mutateAsync({ id: editing, ...form });
    } else {
      await createSubject.mutateAsync(form);
    }
    resetForm();
  };

  const handleEdit = (s: Subject) => {
    setForm({ course_id: s.course_id, name: s.name, profesor_name: s.profesor_name, color: s.color, icon: s.icon });
    setEditing(s.id);
    setShowForm(true);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Asignaturas</h1>
        <button
          onClick={() => { if (!showForm) resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nueva Asignatura"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Curso</label>
            <select
              required
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Selecciona un curso</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>{c.grade} {c.name} {c.section}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Nombre de la Asignatura</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Matemáticas" className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Nombre del Profesor</label>
            <input value={form.profesor_name} onChange={(e) => setForm({ ...form, profesor_name: e.target.value })} placeholder="ej. María García" className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Color</label>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer dark:bg-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Ícono</label>
              <div className="flex flex-wrap gap-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm({ ...form, icon: emoji })}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors ${
                      form.icon === emoji ? "bg-primary-100 dark:bg-primary-900/50 ring-2 ring-primary-500" : "hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" disabled={createSubject.isPending || updateSubject.isPending} className="w-full py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50">
            {createSubject.isPending || updateSubject.isPending ? "Guardando..." : editing ? "Actualizar Asignatura" : "Crear Asignatura"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando asignaturas...</div>
      ) : (
        <div className="space-y-2">
          {subjects?.map((s) => {
            const course = courses?.find((c) => c.id === s.course_id);
            return (
            <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: s.color + "20" }}>
                {s.icon}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {s.profesor_name && `${s.profesor_name} · `}
                  {course && `${course.grade} ${course.name}`}
                </p>
              </div>
              <button
                onClick={() => handleEdit(s)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-primary-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => { if (confirm("¿Eliminar asignatura?")) deleteSubject.mutate(s.id); }}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
          })}
          {subjects?.length === 0 && (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">No hay asignaturas. Crea la primera.</p>
          )}
        </div>
      )}
    </div>
  );
}
