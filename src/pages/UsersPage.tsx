import { useState, useMemo } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useProfiles, useUpdateProfile } from "@/hooks/useProfiles";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAuth } from "@/context/AuthContext";
import { useCourses } from "@/hooks/useCourses";
import { getContrastText, getContrastBorder } from "@/lib/color";
import type { UserRole } from "@/types";
import { useToast } from "@/hooks/useToast";
import { useCreateUser } from "@/hooks/useCreateUser";
import Avatar from "@/components/Avatar/Avatar";
import BackToSettings from "@/components/BackToSettings/BackToSettings";

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30" },
  profesor: { label: "Profesor", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30" },
  usuario: { label: "Alumno", color: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30" },
};

export default function UsersPage() {
  const { profile: currentUser } = useAuth();
  const { data: profiles, isLoading, refetch } = useProfiles();
  const updateProfile = useUpdateProfile();
  const admin = useAdminAuth();
  const { data: courses } = useCourses();
  const toast = useToast();
  const createUserMutation = useCreateUser();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("usuario");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<string | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<string | null>(null);
  const [approveCourseIds, setApproveCourseIds] = useState<string[]>([]);
  const [migrating, setMigrating] = useState(false);

  const { data: courseMembers, refetch: refetchCourseMembers } = useQuery({
    queryKey: ["course-members"],
    queryFn: async () => {
      const { data, error } = await db.from("course_members").select("user_id, course_id");
      if (error) throw error;
      return (data ?? []) as { user_id: string; course_id: string }[];
    },
  });

  const { data: accessRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["access-requests"],
    queryFn: async () => {
      const { data, error } = await db
        .from("access_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AccessRequest[];
    },
  });

  const userCourseMap = useMemo(() => {
    const map = new Map<string, string[]>();
    (courseMembers ?? []).forEach((cm) => {
      const ids = map.get(cm.user_id) ?? [];
      ids.push(cm.course_id);
      map.set(cm.user_id, ids);
    });
    return map;
  }, [courseMembers]);

  const handleToggleUserCourse = async (userId: string, courseId: string) => {
    const current = userCourseMap.get(userId) ?? [];
    const next = current.includes(courseId)
      ? current.filter((id) => id !== courseId)
      : [...current, courseId];
    try {
      await admin.updateCourses(userId, next);
      refetchCourseMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar cursos");
    }
  };

  const isAdmin = currentUser?.role === "admin";
  const isTeacher = isAdmin || currentUser?.role === "profesor";

  const handleCreate = async () => {
    if (!name || !email) return;
    try {
      await createUserMutation.mutateAsync({
        full_name: name,
        email,
        role,
        course_ids: courseIds.length ? courseIds : undefined,
      });
      setName("");
      setEmail("");
      setRole("usuario");
      setCourseIds([]);
      toast.success("Usuario creado correctamente. Se ha enviado un enlace de configuración a su correo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear usuario");
    }
  };

  const toggleCourse = (id: string) => {
    setCourseIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  interface AccessRequest {
    id: string;
    full_name: string;
    email: string;
    created_at: string;
    status: string;
  }

  const handleApprove = async (req: AccessRequest) => {
    if (approveCourseIds.length === 0) {
      toast.error("Selecciona al menos un curso");
      return;
    }
    try {
      await createUserMutation.mutateAsync({
        full_name: req.full_name,
        email: req.email,
        role: "usuario",
        course_ids: approveCourseIds,
      });
      const { error: updateError } = await db
        .from("access_requests")
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: currentUser?.id })
        .eq("id", req.id);
      if (updateError) throw updateError;
      setApprovingRequest(null);
      setApproveCourseIds([]);
      refetchRequests();
      refetch();
      toast.success(`Acceso aprobado para ${req.full_name}. Se ha enviado un enlace de configuración a su correo.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al aprobar solicitud");
    }
  };

  const handleSendSetupLink = async (userId: string) => {
    const ok = await confirm({ title: "Reenviar enlace", message: "¿Enviar un nuevo enlace de configuración a este usuario?", confirmLabel: "Enviar", variant: "default" });
    if (!ok) return;
    try {
      await admin.sendSetupLink(userId);
      toast.success("Enlace de configuración enviado al correo del usuario");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar enlace");
    }
  };

  const handleToggleBlock = async (userId: string) => {
    try {
      await admin.toggleBlock(userId);
      refetch();
      toast.success("Estado actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado");
    }
  };

  const handleDelete = async (userId: string) => {
    const ok = await confirm({ title: "Eliminar usuario", message: "¿Eliminar este usuario permanentemente? No se puede deshacer.", confirmLabel: "Eliminar", variant: "danger" });
    if (!ok) return;
    try {
      await admin.deleteUser(userId);
      refetch();
      toast.success("Usuario eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar usuario");
    }
  };

  const handleSendInfo = async (userId: string) => {
    try {
      await admin.sendInfo(userId);
      toast.success("Información enviada al correo del usuario");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar email");
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    await updateProfile.mutateAsync({ id, role: newRole });
    refetch();
  };

  const handleTogglePermission = async (userId: string, perm: string, current: string[] | null) => {
    const perms = current ?? [];
    const next = perms.includes(perm) ? perms.filter((p) => p !== perm) : [...perms, perm];
    try {
      await admin.updatePermissions(userId, next);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar permisos");
    }
  };

  const handleMigrateAll = async () => {
    const ok = await confirm({
      title: "Migrar todos los usuarios",
      message: "¿Estás seguro? Se invalidarán todos los códigos actuales de alumnos y profesores, y se enviará un enlace de configuración a cada uno por correo.",
      confirmLabel: "Migrar todos",
      variant: "danger",
    });
    if (!ok) return;
    setMigrating(true);
    try {
      const result = await admin.migrateAll();
      toast.success(`Migración completada. Se enviaron ${result.count} enlaces de configuración.`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al migrar usuarios");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestión de Usuarios</h1>
        {isTeacher && (
          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={handleMigrateAll}
                disabled={migrating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-800 text-sm"
              >
                {migrating ? "Migrando..." : "Migrar todos"}
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-primary-800"
            >
              {showForm ? "Cancelar" : "+ Nuevo"}
            </button>
          </div>
        )}
      </div>

      {isTeacher && accessRequests && accessRequests.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">Solicitudes pendientes</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {accessRequests.length}
            </span>
          </div>
          {accessRequests.map((req) => (
            <div key={req.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{req.full_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{req.email}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {new Date(req.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
                  Pendiente
                </span>
              </div>
              {approvingRequest === req.id ? (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">Seleccionar curso(s) para asignar</p>
                  <div className="flex flex-wrap gap-2">
                    {courses?.map((c) => {
                      const selected = approveCourseIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setApproveCourseIds((prev) =>
                              prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            )
                          }
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                            selected
                              ? "bg-primary-600 text-white border-primary-600"
                              : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-primary-300"
                          }`}
                        >
                          {c.grade} {c.name} {c.section}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={createUserMutation.isPending || approveCourseIds.length === 0}
                      className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white transition-colors"
                    >
                      {createUserMutation.isPending ? "Aprobando..." : "Confirmar y enviar enlace"}
                    </button>
                    <button
                      onClick={() => { setApprovingRequest(null); setApproveCourseIds([]); }}
                      className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setApprovingRequest(req.id); setApproveCourseIds([]); }}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 transition-colors"
                >
                  Aprobar
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {showForm && (
        <section className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50 space-y-3">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Nuevo usuario</h2>
          <input
            type="text"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 focus:border-primary-500 focus:ring focus:ring-primary-200"
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 focus:border-primary-500 focus:ring focus:ring-primary-200"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white focus:border-primary-500 focus:ring focus:ring-primary-200"
          >
            <option value="usuario">Alumno</option>
            <option value="profesor">Profesor</option>
            <option value="admin">Admin</option>
          </select>
          {courses && courses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">Asignar a cursos</p>
              <div className="flex flex-wrap gap-2">
                {courses.map((c) => {
                  const selected = courseIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCourse(c.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        selected
                          ? "bg-primary-600 text-white border-primary-600"
                          : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-primary-300"
                      }`}
                    >
                      {c.grade} {c.name} {c.section}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={createUserMutation.isPending || !name || !email}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all"
          >
            {createUserMutation.isPending ? "Creando..." : "Crear usuario"}
          </button>
        </section>
      )}

      {confirmDialog}
      {isLoading ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando usuarios...</div>
      ) : (
        <div className="space-y-2">
          {profiles?.map((p) => {
            const rc = roleConfig[p.role as UserRole] ?? roleConfig.usuario;
            return (
              <div key={p.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar full_name={p.full_name} icon={p.avatar_icon} color={p.avatar_color} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.email ?? "Sin email"}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isAdmin && currentUser?.id !== p.id && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_blocked ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30" : "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30"}`}
                      >
                        {p.is_blocked ? "Bloqueado" : "Activo"}
                      </span>
                    )}
                    {p.role !== "admin" && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.setup_complete
                            ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30"
                            : "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30"
                        }`}
                      >
                        {p.setup_complete ? "Completado" : "Pendiente"}
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-1">
                      {(userCourseMap.get(p.id) ?? []).map((cid) => {
                        const c = courses?.find((co) => co.id === cid);
                        return c ? (
                          <span
                            key={cid}
                            className={"inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border " + getContrastText(c.color)}
                            style={{ backgroundColor: c.color, borderColor: getContrastBorder(c.color) }}
                          >
                            {c.grade} {c.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <select
                    value={p.role}
                    onChange={(e) => handleRoleChange(p.id, e.target.value)}
                    className={`text-xs font-bold px-2 py-1 rounded-full border-0 appearance-none cursor-pointer ${rc.color}`}
                    disabled={!isAdmin || updateProfile.isPending}
                  >
                    {Object.entries(roleConfig).map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.label}</option>
                    ))}
                  </select>
                  {isAdmin && currentUser?.id !== p.id && p.role === "usuario" && (
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={p.permissions?.includes("eventos") ?? false}
                        onChange={() => handleTogglePermission(p.id, "eventos", p.permissions)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-300 cursor-pointer"
                      />
                      Agregar actividades
                    </label>
                  )}
                  {isAdmin && currentUser?.id !== p.id && (
                    <div className="flex flex-wrap gap-1.5 ml-auto">
                      <button
                        onClick={() => setExpandedCourses(expandedCourses === p.id ? null : p.id)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold shadow-sm ${
                          expandedCourses === p.id
                            ? "border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                            : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                        }`}
                        title="Editar cursos del usuario"
                      >
                        Cursos
                      </button>
                      <button
                        onClick={() => handleSendInfo(p.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold shadow-sm"
                        title="Enviar información al correo"
                      >
                        Enviar info
                      </button>
                      <button
                        onClick={() => handleSendSetupLink(p.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold shadow-sm"
                        title="Enviar enlace de configuración"
                      >
                        Enviar enlace
                      </button>
                      <button
                        onClick={() => handleToggleBlock(p.id)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold shadow-sm ${
                          p.is_blocked
                            ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {p.is_blocked ? "Desbloquear" : "Bloquear"}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold shadow-sm"
                        title="Eliminar usuario permanentemente"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
                {expandedCourses === p.id && courses && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">Cursos asignados</p>
                    <div className="flex flex-wrap gap-2">
                      {courses.map((c) => {
                        const selected = (userCourseMap.get(p.id) ?? []).includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleToggleUserCourse(p.id, c.id)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                              selected
                                ? "bg-primary-600 text-white border-primary-600"
                                : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-primary-300"
                            }`}
                          >
                            {c.grade} {c.name} {c.section}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {profiles?.length === 0 && (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">No hay usuarios registrados.</p>
          )}
        </div>
      )}
      <BackToSettings />
    </div>
  );
}
