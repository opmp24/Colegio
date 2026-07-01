import { useState, useRef, useEffect, lazy, Suspense, type KeyboardEvent, type ClipboardEvent } from "react";
import { Navigate } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import InstallButton from "@/components/InstallButton/InstallButton";

const LetterA3d = lazy(() => import("@/components/LetterA3d/LetterA3d"));

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const headerRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tl = gsap.timeline({ defaults: { duration: 0.5, ease: "power3.out" } });
    tl.fromTo(headerRef.current, { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0 })
      .fromTo(formRef.current, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0 }, "-=0.2")
      .fromTo("#pin-inputs > input", { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, stagger: 0.04 }, "-=0.1")
      .fromTo(footerRef.current, { autoAlpha: 0 }, { autoAlpha: 1 }, "-=0.2");
  }, []);

  if (user) return <Navigate to="/" replace />;

  const focusNext = (idx: number) => {
    if (idx < 7) inputRefs.current[idx + 1]?.focus();
  };

  const focusPrev = (idx: number) => {
    if (idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handleChange = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit) focusNext(idx);
    if (next.every((d) => d)) setTimeout(() => handleSubmit(next.join("")), 120);
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx]) focusPrev(idx);
    if (e.key === "Enter") handleSubmit();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    const next = [...digits];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    const focusIdx = Math.min(text.length, 7);
    inputRefs.current[focusIdx]?.focus();
    if (next.every((d) => d)) setTimeout(() => handleSubmit(next.join("")), 120);
  };

  const handleSubmit = async (customPin?: string) => {
    const pin = customPin ?? digits.join("");
    if (pin.length !== 8) return;
    setError("");
    setBlocked(false);
    try {
      const result = await signIn(pin);
      if (result.blocked) setBlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  };

  const handleRecoverySubmit = async () => {
    if (!recoveryEmail) {
      setRecoveryError("Por favor ingresa tu correo electrónico");
      return;
    }

    // Validación básica de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail)) {
      setRecoveryError("Por favor ingresa un correo electrónico válido");
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError("");
    setRecoverySuccess(false);

    try {
      // Llamar a la Edge Function para recuperación de PIN
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: {
          action: "recover-pin",
          email: recoveryEmail,
        },
      });

      if (error) throw error;

      if (!data.ok) {
        throw new Error(data.error || "Error desconocido");
      }

      setRecoverySuccess(true);
      setRecoveryLoading(false);
      // El email se envía en segundo plano, solo mostramos éxito
    } catch (err) {
      setRecoveryLoading(false);
      // No revelamos si el email existe o no por seguridad
      // Pero seguimos el requisito específico del usuario de mostrar mensaje específico
      setRecoveryError(
        err instanceof Error
          ? err.message
          : "Error al procesar la solicitud. Inténtalo nuevamente."
      );
    }
  };

  const handleRecoveryClose = () => {
    setShowRecovery(false);
    setRecoveryEmail("");
    setRecoveryError("");
    setRecoverySuccess(false);
    setRecoveryLoading(false);
  };

  return (
    <div className="min-h-screen bg-school-bg dark:bg-slate-900 flex flex-col items-center justify-center p-6">
      <main className="w-full max-w-sm flex flex-col items-center">
        <header ref={headerRef} className="mb-10 text-center">
          <Suspense fallback={<div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/50 rounded-2xl mx-auto mb-4 animate-pulse" />}>
            <div className="w-20 h-20 mx-auto mb-4 [&>canvas]:rounded-2xl">
              <LetterA3d />
            </div>
          </Suspense>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">Agenda Escolar</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2">Tu día a día, organizado.</p>
        </header>

        <section ref={formRef} className="w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl dark:shadow-slate-900/50 border border-white/40 dark:border-slate-700/40">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-200 mb-2 text-center">Ingresa tu código</h2>
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center mb-6">Usa el código de 8 dígitos que te entregó tu establecimiento.</p>

          {blocked && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Cuenta bloqueada</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">Contacta al administrador.</p>
            </div>
          )}

          <div id="pin-inputs" className="flex gap-2 justify-center mb-6">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                className="w-10 h-12 text-center text-lg font-bold rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-all bg-white dark:bg-slate-700 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="mx-auto mb-4 flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            {showPin ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
            {showPin ? "Ocultar" : "Mostrar"} código
          </button>

          {error && <p className="text-red-500 dark:text-red-400 text-sm text-center mb-4">{error}</p>}

          <button
            onClick={() => handleSubmit()}
            disabled={digits.some((d) => !d)}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary-100 dark:shadow-primary-900/30 transition-all active:scale-[0.98] disabled:shadow-none"
          >
            Ingresar
          </button>

          {/* Link para recuperar PIN */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowRecovery(true)}
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline"
            >
              ¿Olvidó su PIN?
            </button>
          </div>
        </section>

        {/* Modal de recuperación de PIN */}
        {showRecovery && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-200">Recuperar código de acceso</h2>
                <button
                  onClick={handleRecoveryClose}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Ingresa tu correo electrónico registrado para recibir un nuevo código de acceso.
              </p>

              {recoverySuccess && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Si el correo está registrado, se ha enviado un nuevo código de acceso a tu email.
                  </p>
                  <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                    Revisa tu bandeja de entrada (y carpeta de spam).
                  </p>
                </div>
              )}

              {!recoverySuccess && (
                <>
                  {recoveryError && (
                    <p className="text-red-500 dark:text-red-400 text-sm mb-4">{recoveryError}</p>
                  )}
                  <div className="mb-4">
                    <input
                      type="email"
                      placeholder="Tu correo electrónico"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-primary-500 focus:ring focus:ring-primary-200 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                      disabled={recoveryLoading}
                    />
                  </div>

                  <button
                    onClick={handleRecoverySubmit}
                    disabled={recoveryLoading || !recoveryEmail}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all"
                  >
                    {recoveryLoading ? "Enviando..." : "Enviar recuperación"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <footer ref={footerRef} className="mt-12 text-center space-y-2">
          <InstallButton variant="compact" />
          <div>
            <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400 font-bold opacity-40">PWA v1.1</span>
          </div>
        </footer>
      </main>
    </div>
  );
}