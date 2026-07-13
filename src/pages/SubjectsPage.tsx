import { useState } from "react";
import { useCourses } from "@/hooks/useCourses";
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject } from "@/hooks/useSubjects";
import { useConfirm } from "@/hooks/useConfirm";
import BackToSettings from "@/components/BackToSettings/BackToSettings";
import { useToast } from "@/hooks/useToast";
import { getContrastText, getContrastBorder } from "@/lib/color";
import { AVATAR_ICONS } from "@/lib/avatar";
import type { Subject } from "@/types";

export default function SubjectsPage() {
  const { data: courses } = useCourses();
  const { data: subjects, isLoading } = useSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ course_id: "", name: "", profesor_name: "", color: "#6366f1", icon: "book" });
  const [filterCourseId, setFilterCourseId] = useState<string | null>(null); // null = show all
  const [showAllIcons, setShowAllIcons] = useState(false);
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();

  const resetForm = () => {
    setForm({ course_id: "", name: "", profesor_name: "", color: "#6366f1", icon: "book" });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateSubject.mutateAsync({ id: editing, ...form });
        toast.success("Asignatura actualizada correctamente");
      } else {
        await createSubject.mutateAsync(form);
        toast.success("Asignatura creada correctamente");
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar asignatura");
    }
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
                {(showAllIcons ? AVATAR_ICONS : AVATAR_ICONS.slice(0, 5)).map((ico) => (
                  <button
                    key={ico.id}
                    type="button"
                    onClick={() => setForm({ ...form, icon: ico.id })}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors ${
                      form.icon === ico.id
                        ? "bg-primary-100 dark:bg-primary-900/50 ring-2 ring-primary-500"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                    title={ico.label}
                  >
                    {ico.emoji}
                  </button>
                ))}
                {AVATAR_ICONS.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllIcons(!showAllIcons)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-lg font-bold border border-dashed border-slate-300 dark:border-slate-500 text-slate-400 dark:text-slate-500 hover:border-primary-400 hover:text-primary-500 dark:hover:border-primary-400 dark:hover:text-primary-400 bg-white dark:bg-slate-700 transition-colors"
                    title={showAllIcons ? "Ver menos iconos" : "Ver más iconos"}
                  >
                    {showAllIcons ? "−" : "+"}
                  </button>
                )}
              </div>
            </div>
          </div>
          <button type="submit" disabled={createSubject.isPending || updateSubject.isPending} className="w-full py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50">
            {createSubject.isPending || updateSubject.isPending ? "Guardando..." : editing ? "Actualizar Asignatura" : "Crear Asignatura"}
          </button>
        </form>
      )}

      {/* Course filter for subjects list */}
      {courses && courses.length > 0 ? (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
            Filtrar por curso
          </label>
          <select
            value={filterCourseId ?? ""}
            onChange={(e) => setFilterCourseId(e.target.value || null)}
            className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">Todos los cursos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade} {c.name} {c.section ? `- ${c.section}` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-4">
          No hay cursos disponibles para filtrar
        </p>
      )}

{isLoading ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando asignaturas...</div>
      ) : (
        <div className="space-y-2">
          {(subjects || [])
            .filter((s) => filterCourseId === null || s.course_id === filterCourseId)
            .map((s) => {
              const course = courses?.find((c) => c.id === s.course_id);
              return (
                <div key={s.id} className="bg-white dark:bg-slate-800 rounded-none p-4 shadow-sm dark:shadow-slate-900/50 flex items-center gap-3 border border-gray-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border" style={{ backgroundColor: s.color, borderColor: getContrastBorder(s.color) }}>
                    {AVATAR_ICONS.find(i => i.id === s.icon)?.emoji ?? "📚"}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {course && (
                        <span className={"inline-block px-2 py-1 rounded text-sm font-bold border " + getContrastText(course.color)} style={{ backgroundColor: course.color, borderColor: getContrastBorder(course.color) }}>
                          {course.grade} {course.name}
                        </span>
                      )}
                      <span className={"inline-block px-2 py-1 rounded text-sm border font-bold " + getContrastText(s.color)} style={{ backgroundColor: s.color, borderColor: getContrastBorder(s.color) }}>
                        {s.name}
                      </span>
                    </div>
                    {s.profesor_name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.profesor_name}</p>
                    )}
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
                    onClick={async () => {
                      const ok = await confirmDelete({ title: "Eliminar asignatura", message: "¿Estás seguro de eliminar esta asignatura?", variant: "danger" });
                      if (!ok) return;
                      try {
                        await deleteSubject.mutateAsync(s.id);
                        toast.success("Asignatura eliminada correctamente");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Error al eliminar asignatura");
                      }
                    }}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
{(subjects || [])
             .filter((s) => filterCourseId === null || s.course_id === filterCourseId)
             .length === 0 && (
             <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
               {filterCourseId === null ? "No hay asignaturas. Crea la primera." : "No hay asignaturas para este curso"}
             </p>
           )}
          </div>
        )}
        {confirmDialog}
        <BackToSettings />
      </div>
    );
  }
