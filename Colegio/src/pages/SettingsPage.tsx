import { useAuth } from "@/context/AuthContext";
import { useCourses } from "@/hooks/useCourses";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";

export default function SettingsPage() {
  const { profile, signOut } = useAuth();
  const { data: courses } = useCourses();
  const { data: events } = useEvents();
  const { data: users } = useProfiles();

  return (
    <div className="px-4 py-4 space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Ajustes</h1>

      {/* Perfil */}
      <section className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Perfil</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
            {profile?.full_name?.charAt(0) ?? "U"}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">{profile?.full_name}</p>
            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
              profile?.role === "admin" ? "text-red-600 bg-red-50" :
              profile?.role === "profesor" ? "text-blue-600 bg-blue-50" :
              "text-green-600 bg-green-50"
            }`}>
              {profile?.role === "admin" ? "Admin" :
               profile?.role === "profesor" ? "Profesor" : "Usuario"}
            </span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Resumen del Sistema</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-primary-600">{courses?.length ?? 0}</p>
            <p className="text-xs text-slate-500 font-medium">Cursos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-primary-600">{events?.length ?? 0}</p>
            <p className="text-xs text-slate-500 font-medium">Eventos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-primary-600">{users?.length ?? 0}</p>
            <p className="text-xs text-slate-500 font-medium">Usuarios</p>
          </div>
        </div>
      </section>

      {/* App Info */}
      <section className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Información</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Versión</span><span className="font-semibold">1.0.0</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Entorno</span><span className="font-semibold">Producción</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Schema</span><span className="font-semibold font-mono text-xs">Colegio</span></div>
        </div>
      </section>

      {/* Cerrar sesión */}
      <button
        onClick={signOut}
        className="w-full py-3 bg-white border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Cerrar sesión
      </button>
    </div>
  );
}
