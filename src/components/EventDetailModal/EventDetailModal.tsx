import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Event, EvaluationType } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useDeleteEvent } from "@/hooks/useEvents";
import { useToast } from "@/hooks/useToast";
import { getContrastText, getContrastBorder } from "@/lib/color";
import { AVATAR_ICONS } from "@/lib/avatar";
import ConfirmDialog from "@/components/ConfirmDialog/ConfirmDialog";

interface EventDetailModalProps {
  event: Event;
  courseName?: string;
  subjectName?: string;
  subjectIcon?: string;
  subjectColor?: string;
  courseColor?: string;
  evaluationTypes?: EvaluationType[];
  creatorName?: string;
  creatorIcon?: string;
  creatorColor?: string;
  onClose: () => void;
}

export default function EventDetailModal({ event, courseName, subjectName, subjectIcon, subjectColor, courseColor, evaluationTypes, creatorName, creatorIcon, creatorColor, onClose }: EventDetailModalProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const deleteEvent = useDeleteEvent();
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const date = new Date(event.due_date);
  const color = courseColor ?? "#6366f1";

  const typeLabels = useMemo(() => {
    const map: Record<string, string> = {};
    (evaluationTypes ?? []).forEach((t) => { map[t.name] = t.label; });
    return map;
  }, [evaluationTypes]);

  const creatorIconEmoji = useMemo(() => {
    if (!creatorIcon) return undefined;
    const found = AVATAR_ICONS.find((i) => i.id === creatorIcon);
    return found?.emoji;
  }, [creatorIcon]);

  const canEdit = profile?.role === "admin" || profile?.role === "profesor" || event.created_by === profile?.id;

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
            <div className="flex flex-wrap items-center gap-1.5">
              {courseName && (
                <span className={"inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border " + getContrastText(courseColor ?? "#6366f1")} style={{ backgroundColor: courseColor ?? "#6366f1", borderColor: getContrastBorder(courseColor ?? "#6366f1") }}>
                  {courseName}
                </span>
              )}
              {subjectIcon && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs leading-none shrink-0" style={{ backgroundColor: subjectColor ?? "#6366f1" }}>
                  {subjectIcon}
                </span>
              )}
              {subjectName && (
                <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border " + getContrastText(subjectColor ?? "#6366f1")} style={{ backgroundColor: subjectColor ?? "#6366f1", borderColor: getContrastBorder(subjectColor ?? "#6366f1") }}>
                  {subjectName}
                </span>
              )}
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

          {creatorName && (
            <div className="flex items-center gap-2 mb-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Creado por</span>
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ backgroundColor: creatorColor ?? "#6366f1" }}
              >
                {creatorIconEmoji ?? creatorName.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{creatorName}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className={"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border " + getContrastText(color)} style={{ backgroundColor: color, borderColor: getContrastBorder(color) }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getContrastText(color) === "text-white" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.3)" }} />
              {evaluationTypes ? (typeLabels[event.type] ?? event.type) : event.type}
            </div>
            {event.visibility !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                Solo profesores
              </span>
            )}
          </div>

          {event.description && (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Descripción</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {canEdit && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
              <button
                onClick={() => { navigate(`/crear?edit=${event.id}`); onClose(); }}
                className="w-full px-4 py-2.5 border border-primary-200 dark:border-primary-800/50 text-primary-600 dark:text-primary-400 font-semibold rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar actividad
              </button>
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
