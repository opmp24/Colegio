import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNews, useCreateNews, useUpdateNews, useDeleteNews } from "@/hooks/useNews";
import { useCourses } from "@/hooks/useCourses";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import PageTransition from "@/components/PageTransition/PageTransition";
import Avatar from "@/components/Avatar/Avatar";
import { newsSchema } from "@/lib/newsSchema";
import type { News } from "@/types";

export default function NoticiasPage() {
  const { profile } = useAuth();
  const { data: news, isLoading } = useNews();
  const { data: courses } = useCourses();
  const createNews = useCreateNews();
  const updateNews = useUpdateNews();
  const deleteNews = useDeleteNews();
  const toast = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    visibility: "all",
    publish_at: "",
    course_id: "",
  });

  const isStaff = profile?.role === "admin" || profile?.role === "profesor";

  const resetForm = () => {
    setForm({ title: "", description: "", visibility: "all", publish_at: "", course_id: "" });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (n: News) => {
    setForm({
      title: n.title,
      description: n.description ?? "",
      visibility: n.visibility,
      publish_at: n.publish_at ? n.publish_at.slice(0, 16) : "",
      course_id: n.course_id ?? "",
    });
    setEditing(n.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = newsSchema.safeParse(form);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
      toast.error(firstError);
      return;
    }
    try {
      if (editing) {
        await updateNews.mutateAsync({ id: editing, ...parsed.data });
        toast.success("Noticia actualizada correctamente");
      } else {
        await createNews.mutateAsync(parsed.data as any);
        toast.success("Noticia creada correctamente");
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar noticia");
    }
  };

  return (
    <PageTransition>
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Noticias</h1>
          {isStaff && (
            <button
              onClick={() => { if (!showForm) resetForm(); setShowForm(!showForm); }}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
            >
              {showForm ? "Cancelar" : "+ Nueva Noticia"}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 space-y-3">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">
              {editing ? "Editar Noticia" : "Nueva Noticia"}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Título</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Título de la noticia"
                className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Contenido de la noticia..."
                rows={4}
                className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Curso (opcional)</label>
              <select
                value={form.course_id}
                onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Global (todos los cursos)</option>
                {courses?.map((c) => (
                  <option key={c.id} value={c.id}>{c.grade} {c.name} {c.section}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Fecha de publicación (opcional)</label>
              <input
                type="datetime-local"
                value={form.publish_at}
                onChange={(e) => setForm({ ...form, publish_at: e.target.value })}
                className="w-full rounded-lg border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Si se deja vacío, se publica inmediatamente</p>
            </div>
            <div>
              <label className="flex items-center gap-3 py-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.visibility === "all"}
                  onChange={(e) => setForm({ ...form, visibility: e.target.checked ? "all" : "admin_teacher" })}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-300 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Visible para apoderados y alumnos</span>
                </div>
              </label>
            </div>
            <button
              type="submit"
              disabled={createNews.isPending || updateNews.isPending}
              className="w-full py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50"
            >
              {createNews.isPending || updateNews.isPending ? "Guardando..." : editing ? "Actualizar Noticia" : "Crear Noticia"}
            </button>
          </form>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando noticias...</div>
        ) : (
          <div className="space-y-3">
            {news?.length === 0 && (
              <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">No hay noticias publicadas.</p>
            )}
            {news?.map((n) => {
              const isExpanded = expandedId === n.id;
              const creator = n.creator;
              const courseInfo = n.courses;
              return (
                <div
                  key={n.id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setExpandedId(isExpanded ? null : n.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{n.title}</h3>
                        {n.visibility !== "all" && (
                          <span className="shrink-0 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                            Solo profesores
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        {creator && (
                          <span className="flex items-center gap-1">
                            <Avatar full_name={creator.full_name} icon={creator.avatar_icon} color={creator.avatar_color} size="sm" />
                            {creator.full_name}
                          </span>
                        )}
                        <span>&middot;</span>
                        <span>{new Date(n.created_at).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" })}</span>
                        {courseInfo && (
                          <>
                            <span>&middot;</span>
                            <span>{courseInfo.grade} {courseInfo.name}</span>
                          </>
                        )}
                        {!courseInfo && (
                          <>
                            <span>&middot;</span>
                            <span className="text-primary-600 dark:text-primary-400 font-medium">Global</span>
                          </>
                        )}
                      </div>
                      {isExpanded && n.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 whitespace-pre-wrap">{n.description}</p>
                      )}
                    </div>
                  </div>
                  {isStaff && isExpanded && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(n); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const ok = await confirm({ title: "Eliminar noticia", message: "¿Estás seguro de eliminar esta noticia?", confirmLabel: "Eliminar", variant: "danger" });
                          if (!ok) return;
                          try {
                            await deleteNews.mutateAsync(n.id);
                            toast.success("Noticia eliminada");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Error al eliminar noticia");
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {confirmDialog}
      </div>
    </PageTransition>
  );
}
