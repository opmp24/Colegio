import { useState } from "react";
import type { Event } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useDeleteEvent } from "@/hooks/useEvents";
import { useToast } from "@/hooks/useToast";
import ConfirmDialog from "@/components/ConfirmDialog/ConfirmDialog";

interface EventDetailModalProps {
  event: Event;
  courseName?: string;
  subjectName?: string;
  subjectIcon?: string;
  courseColor?: string;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  test: "Prueba",
  exam: "Examen",
  homework: "Trabajo",
  essay: "Ensayos",
  other: "Otros",
};

export default function EventDetailModal({ event, courseName, subjectName, subjectIcon, courseColor, onClose }: EventDetailModalProps) {
  const { profile } = useAuth();
  const deleteEvent = useDeleteEvent();
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const date = new Date(event.due_date);
  const color = courseColor ?? "#6366f1";

  const canDelete = profile?.role === "admin" || profile?.role === "profesor" || event.created_by === profile?.id;

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success("Actividad eliminada");
      onClose();
    } catch {
      toast.error("Error al eliminar actividad");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90dvh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {subjectName ?? typeLabels[event.type] ?? event.type}
                {courseName && ` · ${courseName}`}
              </span>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{event.title}</h2>

          <div className="flex items-center gap-2 mb-4 text-sm text-slate-500 dark:text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="font-semibold">{date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          {subjectIcon && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{subjectIcon}</span>
              {subjectName && <span className="text-sm text-slate-600 dark:text-slate-300">{subjectName}</span>}
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ color, backgroundColor: `${color}15` }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {typeLabels[event.type] ?? event.type}
          </div>

          {event.description && (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Descripción</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {canDelete && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full px-4 py-2.5 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar actividad
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Eliminar actividad"
        message={`¿Estás seguro de eliminar "${event.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
