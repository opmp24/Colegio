import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCourses } from "@/hooks/useCourses";
import { useEvents } from "@/hooks/useEvents";
import { useProfiles } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";
import { useUpdateProfile } from "@/hooks/useProfiles";
import { useToast } from "@/hooks/useToast";
import InstallButton from "@/components/InstallButton/InstallButton";
import Avatar from "@/components/Avatar/Avatar";
import { AVATAR_ICONS, AVATAR_COLORS } from "@/lib/avatar";

export default function SettingsPage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { data: courses } = useCourses();
  const { data: events } = useEvents();
  const { data: users } = useProfiles();
  const { isDark, toggle: toggleDark } = useTheme();
  const updateProfile = useUpdateProfile();
  const toast = useToast();

  const [selectedIcon, setSelectedIcon] = useState(profile?.avatar_icon ?? "");
  const [selectedColor, setSelectedColor] = useState(profile?.avatar_color ?? AVATAR_COLORS[0].value);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const avatarChanged = selectedIcon !== (profile?.avatar_icon ?? "") || selectedColor !== (profile?.avatar_color ?? AVATAR_COLORS[0].value);

  const handleSaveAvatar = async () => {
    if (!profile || !avatarChanged) return;
    setSavingAvatar(true);
    try {
      await updateProfile.mutateAsync({ id: profile.id, avatar_icon: selectedIcon, avatar_color: selectedColor });
      await refreshProfile();
      toast.success("Avatar actualizado");
    } catch {
      toast.error("Error al guardar avatar");
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-6">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ajustes</h1>

      {/* Perfil */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm dark:shadow-slate-900/50">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Perfil</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <Avatar full_name={profile?.full_name ?? ""} icon={selectedIcon} color={selectedColor} size="lg" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-700 rounded-full shadow-sm flex items-center justify-center">
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{profile?.full_name}</p>
            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
              profile?.role === "admin" ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30" :
              profile?.role === "profesor" ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30" :
              "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30"
            }`}>
              {profile?.role === "admin" ? "Admin" :
               profile?.role === "profesor" ? "Profesor" : "Alumno"}
            </span>
          </div>
        </div>

        {/* Color picker */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedColor(c.value)}
                className={`w-8 h-8 rounded-full transition-all ${selectedColor === c.value ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800 scale-110" : "hover:scale-110"}`}
                style={{ backgroundColor: c.value }}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Icono</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedIcon("")}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all border ${
                selectedIcon === ""
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                  : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500"
              }`}
            >
              A
            </button>
            {AVATAR_ICONS.map((ico) => (
              <button
                key={ico.id}
                onClick={() => setSelectedIcon(ico.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all border ${
                  selectedIcon === ico.id
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                    : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
                }`}
                title={ico.label}
              >
                {ico.emoji}
              </button>
            ))}
          </div>
        </div>

        {avatarChanged && (
          <button
            onClick={handleSaveAvatar}
            disabled={savingAvatar}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold rounded-xl text-sm transition-all"
          >
            {savingAvatar ? "Guardando..." : "Guardar avatar"}
          </button>
        )}
      </section>

      {/* Apariencia */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm dark:shadow-slate-900/50">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Apariencia</h2>
        <button
          onClick={toggleDark}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {isDark ? (
              <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd"/>
              </svg>
            )}
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isDark ? "Modo claro" : "Modo oscuro"}
            </span>
          </div>
          <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${isDark ? "bg-primary-600" : "bg-slate-300"}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isDark ? "translate-x-5" : "translate-x-0"}`} />
          </div>
        </button>
      </section>

      {/* Stats */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm dark:shadow-slate-900/50">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Resumen del Sistema</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-primary-600 dark:text-primary-400">{courses?.length ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cursos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-primary-600 dark:text-primary-400">{events?.length ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Eventos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-primary-600 dark:text-primary-400">{users?.length ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Usuarios</p>
          </div>
        </div>
      </section>

      {/* App Info */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm dark:shadow-slate-900/50">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Información</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Versión</span><span className="font-semibold dark:text-slate-200">1.1.0</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Entorno</span><span className="font-semibold dark:text-slate-200">Producción</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Schema</span><span className="font-semibold font-mono text-xs dark:text-slate-200">Colegio</span></div>
        </div>
      </section>

      {/* Cerrar sesión */}
      <button
        onClick={signOut}
        className="w-full py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Cerrar sesión
      </button>

      <InstallButton variant="full" />
    </div>
  );
}
