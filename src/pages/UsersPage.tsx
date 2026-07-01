import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useProfiles, useUpdateProfile } from "@/hooks/useProfiles";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAuth } from "@/context/AuthContext";
import { useCourses } from "@/hooks/useCourses";
import type { UserRole } from "@/types";
import { useToast } from "@/hooks/useToast";
import { useCreateUser } from "@/hooks/useCreateUser";

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30" },
  profesor: { label: "Profesor", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30" },
  usuario: { label: "Usuario", color: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30" },
};

export default function UsersPage() {
  const { profile: currentUser } = useAuth();
  const { data: profiles, isLoading, refetch } = useProfiles();
  const updateProfile = useUpdateProfile();
  const admin = useAdminAuth();
  const { data: courses } = useCourses();
  const toast = useToast();
  const createUserMutation = useCreateUser();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("usuario");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<string | null>(null);

  const { data: courseMembers, refetch: refetchCourseMembers } = useQuery({
    queryKey: ["course-members"],
    queryFn: async () => {
      const { data, error } = await db.from("course_members").select("user_id, course_id");
      if (error) throw error;
      return (data ?? []) as { user_id: string; course_id: string }[];
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

  const handleCreate = async () => {
    if (!name || !email) return;
    try {
      const result = await createUserMutation.mutateAsync({
        full_name: name,
        email,
        role,
        course_ids: courseIds.length ? courseIds : undefined,
      });
      setNewPin(result.pin);
      setName("");
      setEmail("");
      setRole("usuario");
      setCourseIds([]);
      toast.success("Usuario creado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear usuario");
    }
  };

  const toggleCourse = (id: string) => {
    setCourseIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const handleResetPin = async (userId: string) => {
    if (!window.confirm("¿Generar un nuevo código para este usuario?")) return;
    try {
      const result = await admin.resetPin(userId);
      setNewPin(result.pin);
      refetch();
      toast.success("Nuevo código generado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al resetear código");
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
    if (!window.confirm("¿Eliminar este usuario permanentemente? No se puede deshacer.")) return;
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

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestión de Usuarios</h1>
{isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus:ring-primary-800"
            >
              {showForm ? "Cancelar" : "+ Nuevo"}
            </button>
          )}
      </div>

      {newPin && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
          <p className="text-sm font-bold text-primary-700 dark:text-primary-300 mb-1">Código generado</p>
          <p className="text-2xl font-black text-primary-600 dark:text-primary-400 tracking-widest text-center py-2 select-all">
            {newPin}
          </p>
          <p className="text-xs text-primary-500 dark:text-primary-400 text-center">
            Código de acceso de 8 dígitos. Compártelo de forma segura con el usuario.
          </p>
          <button
            onClick={() => setNewPin(null)}
            className="mt-2 w-full text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            Cerrar
          </button>
        </div>
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
            <option value="usuario">Usuario</option>
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

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando usuarios...</div>
      ) : (
        <div className="space-y-2">
          {profiles?.map((p) => {
            const rc = roleConfig[p.role as UserRole] ?? roleConfig.usuario;
            return (
              <div key={p.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm dark:shadow-slate-900/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm shrink-0">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.email ?? "Sin email"}</p>
                  </div>
                  {isAdmin && currentUser?.id !== p.id && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_blocked ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30" : "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30"}`}
                    >
                      {p.is_blocked ? "Bloqueado" : "Activo"}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-1">
                      {(userCourseMap.get(p.id) ?? []).map((cid) => {
                        const c = courses?.find((co) => co.id === cid);
                        return c ? (
                          <span
                            key={cid}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: c.color + "20", color: c.color }}
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
                        onClick={() => handleResetPin(p.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold shadow-sm"
                        title="Generar nuevo código"
                      >
                        Resetear código
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
    </div>
  );
}