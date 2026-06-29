import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import InstallButton from "@/components/InstallButton/InstallButton";

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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
  };

  const handleSubmit = async () => {
    const pin = digits.join("");
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
    <div className="min-h-screen bg-school-bg flex flex-col items-center justify-center p-6">
      <main className="w-full max-w-sm flex flex-col items-center">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-2xl mb-4 shadow-sm">
            <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Agenda Escolar</h1>
          <p className="text-gray-500 mt-2">Tu día a día, organizado.</p>
        </header>

        <section className="w-full bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/40">
          <h2 className="text-xl font-semibold text-gray-700 mb-2 text-center">Ingresa tu código</h2>
          <p className="text-sm text-gray-400 text-center mb-6">Usa el código de 8 dígitos que te entregó tu establecimiento.</p>

          {blocked && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="text-sm font-medium text-red-600">Cuenta bloqueada</p>
              <p className="text-xs text-red-500 mt-1">Contacta al administrador.</p>
            </div>
          )}

          <div className="flex gap-2 justify-center mb-6">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                className="w-10 h-12 text-center text-lg font-bold rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-all bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={digits.some((d) => !d)}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary-100 transition-all active:scale-[0.98] disabled:shadow-none"
          >
            Ingresar
          </button>

          {/* Link para recuperar PIN */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowRecovery(true)}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 underline"
            >
              ¿Olvidó su PIN?
            </button>
          </div>
        </section>

        {/* Modal de recuperación de PIN */}
        {showRecovery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-700">Recuperar código de acceso</h2>
                <button
                  onClick={handleRecoveryClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Ingresa tu correo electrónico registrado para recibir un nuevo código de acceso.
              </p>

              {recoverySuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm font-medium text-green-600">
                    Si el correo está registrado, se ha enviado un nuevo código de acceso a tu email.
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    Revisa tu bandeja de entrada (y carpeta de spam).
                  </p>
                </div>
              )}

              {!recoverySuccess && (
                <>
                  {recoveryError && (
                    <p className="text-red-500 text-sm mb-4">{recoveryError}</p>
                  )}
                  <div className="mb-4">
                    <input
                      type="email"
                      placeholder="Tu correo electrónico"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring focus:ring-primary-200"
                      disabled={recoveryLoading}
                    />
                  </div>

                  <button
                    onClick={handleRecoverySubmit}
                    disabled={recoveryLoading || !recoveryEmail}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl transition-all"
                  >
                    {recoveryLoading ? "Enviando..." : "Enviar recuperación"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <footer className="mt-12 text-center space-y-2">
          <InstallButton variant="compact" />
          <div>
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold opacity-40">PWA v1.0</span>
          </div>
        </footer>
      </main>
    </div>
  );
}