import { useState } from "react";
import { useProfiles, useUpdateProfile } from "@/hooks/useProfiles";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAuth } from "@/context/AuthContext";
import { useCourses } from "@/hooks/useCourses";
import type { UserRole } from "@/types";

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "text-red-600 bg-red-50" },
  profesor: { label: "Profesor", color: "text-blue-600 bg-blue-50" },
  usuario: { label: "Usuario", color: "text-green-600 bg-green-50" },
};

export default function UsersPage() {
  const { profile: currentUser } = useAuth();
  const { data: profiles, isLoading, refetch } = useProfiles();
  const updateProfile = useUpdateProfile();
  const admin = useAdminAuth();
  const { data: courses } = useCourses();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("usuario");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const handleCreate = async () => {
    if (!name || !email) return;
    setCreating(true);
    try {
      const result = await admin.createUser({ full_name: name, email, role, course_ids: courseIds.length ? courseIds : undefined });
      setNewPin(result.pin);
      setName("");
      setEmail("");
      setRole("usuario");
      setCourseIds([]);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setCreating(false);
    }
  };

  const toggleCourse = (id: string) => {
    setCourseIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const handleResetPin = async (userId: string) => {
    if (!confirm("¿Generar un nuevo código para este usuario?")) return;
    try {
      const result = await admin.resetPin(userId);
      setNewPin(result.pin);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al resetear código");
    }
  };

  const handleToggleBlock = async (userId: string) => {
    try {
      await admin.toggleBlock(userId);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al cambiar estado");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Eliminar este usuario permanentemente? No se puede deshacer.")) return;
    try {
      await admin.deleteUser(userId);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar usuario");
    }
  };

  const handleSendInfo = async (userId: string) => {
    try {
      await admin.sendInfo(userId);
      alert("Información enviada al correo del usuario.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al enviar email");
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
      alert(err instanceof Error ? err.message : "Error al actualizar permisos");
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Gestión de Usuarios</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            {showForm ? "Cancelar" : "+ Nuevo"}
          </button>
        )}
      </div>

      {newPin && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <p className="text-sm font-bold text-primary-700 mb-1">Código generado</p>
          <p className="text-2xl font-black text-primary-600 tracking-widest text-center py-2 select-all">
            {newPin}
          </p>
          <p className="text-xs text-primary-500 text-center">
            Código de acceso de 8 dígitos. Compártelo de forma segura con el usuario.
          </p>
          <button
            onClick={() => setNewPin(null)}
            className="mt-2 w-full text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Cerrar
          </button>
        </div>
      )}

      {showForm && (
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-800">Nuevo usuario</h2>
          <input
            type="text"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring focus:ring-primary-200"
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring focus:ring-primary-200"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring focus:ring-primary-200 bg-white"
          >
            <option value="usuario">Usuario</option>
            <option value="profesor">Profesor</option>
            <option value="admin">Admin</option>
          </select>
          {courses && courses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Asignar a cursos</p>
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
                          : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
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
            disabled={creating || !name || !email}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl transition-all"
          >
            {creating ? "Creando..." : "Crear usuario"}
          </button>
        </section>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Cargando usuarios...</div>
      ) : (
        <div className="space-y-2">
          {profiles?.map((p) => {
            const rc = roleConfig[p.role as UserRole] ?? roleConfig.usuario;
            return (
              <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{p.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{p.email ?? "Sin email"}</p>
                  </div>
                  {isAdmin && currentUser?.id !== p.id && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_blocked ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50"}`}
                    >
                      {p.is_blocked ? "Bloqueado" : "Activo"}
                    </span>
                  )}
                </div>
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
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={p.permissions?.includes("eventos") ?? false}
                        onChange={() => handleTogglePermission(p.id, "eventos", p.permissions)}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-300 cursor-pointer"
                      />
                      Agregar actividades
                    </label>
                  )}
                  {isAdmin && currentUser?.id !== p.id && (
                    <div className="flex flex-wrap gap-1.5 ml-auto">
                      <button
                        onClick={() => handleSendInfo(p.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-sm"
                        title="Enviar información al correo"
                      >
                        Enviar info
                      </button>
                      <button
                        onClick={() => handleResetPin(p.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold shadow-sm"
                        title="Generar nuevo código"
                      >
                        Resetear código
                      </button>
                      <button
                        onClick={() => handleToggleBlock(p.id)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold shadow-sm ${
                          p.is_blocked
                            ? "border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
                            : "border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                        }`}
                      >
                        {p.is_blocked ? "Desbloquear" : "Bloquear"}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 font-semibold shadow-sm"
                        title="Eliminar usuario permanentemente"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {profiles?.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">No hay usuarios registrados.</p>
          )}
        </div>
      )}
    </div>
  );
}
