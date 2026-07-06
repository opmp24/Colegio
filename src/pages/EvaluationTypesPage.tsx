import { useState } from "react";
import { useEvaluationTypes, useCreateEvaluationType, useUpdateEvaluationType, useDeleteEvaluationType } from "@/hooks/useEvaluationTypes";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/hooks/useToast";
import type { EvaluationType } from "@/types";

export default function EvaluationTypesPage() {
  const { data: evaluationTypes, isLoading } = useEvaluationTypes();
  const createMutation = useCreateEvaluationType();
  const updateMutation = useUpdateEvaluationType();
  const deleteMutation = useDeleteEvaluationType();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", label: "" });
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();

  const resetForm = () => {
    setForm({ name: "", label: "" });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing, ...form });
        toast.success("Tipo de evaluación actualizado correctamente");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Tipo de evaluación creado correctamente");
      }
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === "object" && err !== null ? JSON.stringify(err) : "Error al guardar tipo de evaluación";
toast.error(msg);
    }
  };

  const handleEdit = (et: EvaluationType) => {
    setForm({ name: et.name, label: et.label });
    setEditing(et.id);
    setShowForm(true);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tipos de Evaluación</h1>
        <button
          onClick={() => { if (!showForm) resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nuevo Tipo"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Nombre interno</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ej. test, exam, homework"
              className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Valor que se guarda en la actividad (ej. "test")</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Etiqueta visible</label>
            <input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="ej. Prueba, Examen, Trabajo"
              className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Texto que ven los usuarios al seleccionar o ver el tipo</p>
          </div>
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50">
            {createMutation.isPending || updateMutation.isPending ? "Guardando..." : editing ? "Actualizar Tipo" : "Crear Tipo"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando tipos de evaluación...</div>
      ) : (
        <div className="space-y-2">
          {(evaluationTypes || []).map((et) => (
            <div key={et.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-bold text-slate-800 dark:text-slate-100">{et.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">{et.name}</code>
                </p>
              </div>
              <button
                onClick={() => handleEdit(et)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-primary-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={async () => {
                  const ok = await confirmDelete({ title: "Eliminar tipo", message: "¿Estás seguro de eliminar este tipo de evaluación?", variant: "danger" });
                  if (!ok) return;
                  try {
                    await deleteMutation.mutateAsync(et.id);
                    toast.success("Tipo de evaluación eliminado correctamente");
                  } catch (err) {
const deleteErrMsg = err instanceof Error ? err.message : typeof err === "object" && err !== null ? JSON.stringify(err) : "Error al eliminar tipo de evaluación";
                    toast.error(deleteErrMsg);
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
          {(evaluationTypes || []).length === 0 && (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
              No hay tipos de evaluación. Crea el primero.
            </p>
          )}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
