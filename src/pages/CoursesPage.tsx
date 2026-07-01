import { useState } from "react";
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from "@/hooks/useCourses";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";

export default function CoursesPage() {
  const { data: courses, isLoading } = useCourses();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", grade: "", section: "", color: "#6366f1" });
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();

  const resetForm = () => {
    setForm({ name: "", grade: "", section: "", color: "#6366f1" });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateCourse.mutateAsync({ id: editing, ...form });
        toast.success("Curso actualizado correctamente");
      } else {
        await createCourse.mutateAsync(form);
        toast.success("Curso creado correctamente");
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar curso");
    }
  };

  const handleEdit = (c: { id: string; name: string; grade: string; section: string; color: string }) => {
    setForm({ name: c.name, grade: c.grade, section: c.section, color: c.color });
    setEditing(c.id);
    setShowForm(true);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestión de Cursos</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nuevo Curso"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 space-y-3">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">{editing ? "Editar Curso" : "Nuevo Curso"}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Curso</label>
              <input required value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="8vo" className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Letra</label>
              <input required value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Nombre del Curso</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Matemáticas" className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer" />
          </div>
          <button type="submit" disabled={createCourse.isPending || updateCourse.isPending} className="w-full py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50">
            {createCourse.isPending || updateCourse.isPending ? "Guardando..." : editing ? "Actualizar Curso" : "Crear Curso"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando cursos...</div>
      ) : (
        <div className="space-y-2">
          {courses?.map((c) => (
            <div key={c.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 flex items-center gap-3">
              <div className="w-3 h-10 rounded-full" style={{ backgroundColor: c.color }} />
              <div className="flex-1">
                <p className="font-bold text-slate-800 dark:text-slate-100">{c.grade} {c.name} {c.section}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Creado {new Date(c.created_at).toLocaleDateString("es-CL")}</p>
              </div>
              <button
                onClick={() => handleEdit(c)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-primary-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={async () => {
                  const ok = await confirmDelete({ title: "Eliminar curso", message: "¿Estás seguro de eliminar este curso?", variant: "danger" });
                  if (!ok) return;
                  try {
                    await deleteCourse.mutateAsync(c.id);
                    toast.success("Curso eliminado correctamente");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Error al eliminar curso");
                  }
                }}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          {courses?.length === 0 && (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">No hay cursos creados. Crea el primero.</p>
          )}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
