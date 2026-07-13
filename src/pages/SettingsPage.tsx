import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/useToast";
import InstallButton from "@/components/InstallButton/InstallButton";
import IosInstallGuide from "@/components/IosInstallGuide/IosInstallGuide";
import Avatar from "@/components/Avatar/Avatar";
import { APP_VERSION } from "@/lib/config";
import { AVATAR_ICONS, AVATAR_COLORS } from "@/lib/avatar";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { profile, signOut, refreshProfile } = useAuth();
  const { isDark, toggle: toggleDark } = useTheme();
  const admin = useAdminAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedIcon, setSelectedIcon] = useState(profile?.avatar_icon ?? "");
  const [selectedColor, setSelectedColor] = useState(profile?.avatar_color ?? AVATAR_COLORS[0].value);
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(["", "", "", ""]);
  const [showChangePin, setShowChangePin] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [pinError, setPinError] = useState("");

  const avatarChanged = selectedIcon !== (profile?.avatar_icon ?? "") || selectedColor !== (profile?.avatar_color ?? AVATAR_COLORS[0].value);

  const handleSaveAvatar = async () => {
    if (!profile || !avatarChanged) return;
    setSavingAvatar(true);
    try {
      const { error } = await db.from("profiles").update({ avatar_icon: selectedIcon, avatar_color: selectedColor }).eq("id", profile.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      await refreshProfile();
      toast.success("Avatar actualizado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al guardar avatar";
      toast.error(msg);
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleChangePin = async () => {
    const currentPin = pinDigits.join("");
    const newPin = confirmPinDigits.join("");

    if (currentPin.length !== 4 || newPin.length !== 4) return;
    if (currentPin === newPin) {
      setPinError("El nuevo PIN debe ser diferente al actual");
      return;
    }

    setChangingPin(true);
    setPinError("");
    try {
      await admin.changePin(currentPin, newPin);
      toast.success("PIN cambiado correctamente");
      setShowChangePin(false);
      setPinDigits(["", "", "", ""]);
      setConfirmPinDigits(["", "", "", ""]);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Error al cambiar PIN");
    } finally {
      setChangingPin(false);
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
            {(showAllIcons ? AVATAR_ICONS : AVATAR_ICONS.slice(0, 5)).map((ico) => (
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
            {AVATAR_ICONS.length > 5 && (
              <button
                onClick={() => setShowAllIcons(!showAllIcons)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold border border-dashed border-slate-300 dark:border-slate-500 text-slate-400 dark:text-slate-500 hover:border-primary-400 hover:text-primary-500 dark:hover:border-primary-400 dark:hover:text-primary-400 bg-white dark:bg-slate-700 transition-colors"
                title={showAllIcons ? "Ver menos iconos" : "Ver más iconos"}
              >
                {showAllIcons ? "−" : "+"}
              </button>
            )}
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

      {/* Cambiar PIN */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm dark:shadow-slate-900/50">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Seguridad</h2>
        {!showChangePin ? (
          <button
            onClick={() => setShowChangePin(true)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cambiar PIN</span>
            </div>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Ingresa tu PIN actual y el nuevo PIN de 4 dígitos.</p>

            {pinError && (
              <p className="text-red-500 dark:text-red-400 text-sm text-center">{pinError}</p>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">PIN actual</p>
              <div className="flex gap-2 justify-center">
                {pinDigits.map((d, i) => (
                  <input
                    key={i}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => {
                      const digit = e.target.value.replace(/\D/g, "").slice(0, 1);
                      const next = [...pinDigits];
                      next[i] = digit;
                      setPinDigits(next);
                      if (digit && i < 3) {
                        const nextInput = document.getElementById(`pin-current-${i + 1}`);
                        nextInput?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !pinDigits[i] && i > 0) {
                        const prevInput = document.getElementById(`pin-current-${i - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    id={`pin-current-${i}`}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-all bg-white dark:bg-slate-700 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Nuevo PIN</p>
              <div className="flex gap-2 justify-center">
                {confirmPinDigits.map((d, i) => (
                  <input
                    key={i}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => {
                      const digit = e.target.value.replace(/\D/g, "").slice(0, 1);
                      const next = [...confirmPinDigits];
                      next[i] = digit;
                      setConfirmPinDigits(next);
                      if (digit && i < 3) {
                        const nextInput = document.getElementById(`pin-new-${i + 1}`);
                        nextInput?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !confirmPinDigits[i] && i > 0) {
                        const prevInput = document.getElementById(`pin-new-${i - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    id={`pin-new-${i}`}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-all bg-white dark:bg-slate-700 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChangePin(false);
                  setPinDigits(["", "", "", ""]);
                  setConfirmPinDigits(["", "", "", ""]);
                  setPinError("");
                }}
                disabled={changingPin}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePin}
                disabled={changingPin || pinDigits.some((d) => !d) || confirmPinDigits.some((d) => !d)}
                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold py-3 rounded-xl text-sm transition-all"
              >
                {changingPin ? "Cambiando..." : "Cambiar PIN"}
              </button>
            </div>
          </div>
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

      {/* Gestión */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm dark:shadow-slate-900/50">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Gestión</h2>
        {profile?.role !== "usuario" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/cursos")}
              className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Cursos
            </button>
            <button
              onClick={() => navigate("/asignaturas")}
              className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z M12 14l9-5-9-5-9 5 9 5z M12 22v-8" />
              </svg>
              Asignaturas
            </button>
            <button
              onClick={() => navigate("/tipos-evaluacion")}
              className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Evaluaciones
            </button>
            {profile?.role === "admin" && (
              <button
                onClick={() => navigate("/usuarios")}
                className="flex items-center gap-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Usuarios
              </button>
            )}
          </div>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium text-red-600 dark:text-red-400 mt-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
        <button
          onClick={() => navigate("/log-actividades")}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-sm font-medium text-primary-600 dark:text-primary-400 mt-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Log de actividades
        </button>
      </section>

      {/* App Info */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm dark:shadow-slate-900/50">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Información</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Versión</span><span className="font-semibold dark:text-slate-200">{APP_VERSION}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Entorno</span><span className="font-semibold dark:text-slate-200">Producción</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">© 2026 Colegio</span><span className="font-semibold text-[11px] dark:text-slate-200">Todos los derechos reservados</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Schema</span><span className="font-semibold font-mono text-xs dark:text-slate-200">Colegio</span></div>
        </div>
      </section>

      <InstallButton variant="full" />
      <IosInstallGuide variant="full" />
    </div>
  );
}
