import { useState, useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAuth } from "@/context/AuthContext";
import { APP_VERSION } from "@/lib/config";

export default function SetupPinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const admin = useAdminAuth();
  const { user: authUser, signIn } = useAuth();

  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [userInfo, setUserInfo] = useState<{ user_id: string; email: string; full_name: string } | null>(null);

  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [confirmDigits, setConfirmDigits] = useState<string[]>(["", "", "", ""]);
  const [step, setStep] = useState<"token" | "pin" | "confirm" | "done">("token");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const headerRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenError("No se encontró un token de configuración.");
      return;
    }

    admin.verifySetupToken(token)
      .then((result) => {
        setUserInfo({ user_id: result.user_id, email: result.email, full_name: result.full_name });
        setStep("pin");
        setVerifying(false);
      })
      .catch((err) => {
        setTokenError(err instanceof Error ? err.message : "Error al verificar el enlace");
        setVerifying(false);
      });
  }, [token, admin]);

  useEffect(() => {
    if (step === "done" && !authUser) return;
    if (step === "done" && authUser) {
      navigate("/", { replace: true });
    }
  }, [step, authUser, navigate]);

  useEffect(() => {
    if (step === "pin" || step === "confirm") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline({ defaults: { duration: 0.5, ease: "power3.out" } });
      tl.fromTo(headerRef.current, { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0 })
        .fromTo(formRef.current, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0 }, "-=0.2")
        .fromTo("#pin-inputs input", { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, stagger: 0.04 }, "-=0.1");
    }
  }, [step]);

  const focusNext = (refs: React.MutableRefObject<(HTMLInputElement | null)[]>, idx: number) => {
    if (idx < 3) refs.current[idx + 1]?.focus();
  };

  const focusPrev = (refs: React.MutableRefObject<(HTMLInputElement | null)[]>, idx: number) => {
    if (idx > 0) refs.current[idx - 1]?.focus();
  };

  const handlePinChange = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit) focusNext(inputRefs, idx);
    if (next.every((d) => d)) {
      setTimeout(() => {
        setStep("confirm");
        setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
      }, 200);
    }
  };

  const handlePinKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx]) focusPrev(inputRefs, idx);
  };

  const handleConfirmChange = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(0, 1);
    const next = [...confirmDigits];
    next[idx] = digit;
    setConfirmDigits(next);
    if (digit) focusNext(confirmInputRefs, idx);
  };

  const handleConfirmKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !confirmDigits[idx]) focusPrev(confirmInputRefs, idx);
    if (e.key === "Enter" && confirmDigits.every((d) => d)) handleSubmit();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const next = [...digits];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    const focusIdx = Math.min(text.length, 3);
    inputRefs.current[focusIdx]?.focus();
    if (next.every((d) => d)) {
      setTimeout(() => {
        setStep("confirm");
        setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
      }, 200);
    }
  };

  const handleSubmit = async () => {
    const pin = digits.join("");
    const confirm = confirmDigits.join("");

    if (pin.length !== 4) return;
    if (pin !== confirm) {
      setError("Los códigos no coinciden. Inténtalo de nuevo.");
      setConfirmDigits(["", "", "", ""]);
      setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await admin.completeSetup(token!, pin);
      await signIn(userInfo!.email, pin);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al configurar el código");
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setStep("pin");
    setDigits(["", "", "", ""]);
    setConfirmDigits(["", "", "", ""]);
    setError("");
  };

  if (authUser && step !== "done") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-school-bg dark:bg-slate-900 flex flex-col items-center justify-center p-6">
      <main className="w-full max-w-sm flex flex-col items-center">
        {verifying && (
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Verificando enlace...</p>
          </div>
        )}

        {tokenError && !verifying && (
          <div className="w-full backdrop-blur-sm p-8 rounded-3xl shadow-xl dark:shadow-slate-900/50 border border-white/40 dark:border-slate-700/40 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Enlace inválido</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{tokenError}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Solicita un nuevo enlace en "¿Olvidó su PIN?" en la página de inicio de sesión, o contacta al administrador.
            </p>
            <a
              href="/login"
              className="mt-6 inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all"
            >
              Ir al inicio de sesión
            </a>
          </div>
        )}

        {(step === "pin" || step === "confirm") && userInfo && (
          <>
            <header ref={headerRef} className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Configurar código</h1>
              <p className="text-gray-500 dark:text-slate-400 mt-2">
                Hola <strong className="text-primary-600 dark:text-primary-400">{userInfo.full_name}</strong>
              </p>
            </header>

            <section ref={formRef} className="w-full backdrop-blur-sm p-8 rounded-3xl shadow-xl dark:shadow-slate-900/50 border border-white/40 dark:border-slate-700/40">
              {step === "pin" && (
                <>
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-2 text-center">
                    Crea tu código de acceso
                  </h2>
                  <p className="text-sm text-gray-400 dark:text-slate-500 text-center mb-6">
                    Elige un código numérico de 4 dígitos.
                  </p>

                  <div id="pin-inputs" className="flex flex-col items-center gap-2 mb-6">
                    <div className="flex gap-2 justify-center">
                      {digits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => { inputRefs.current[i] = el; }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handlePinChange(i, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(i, e)}
                          onPaste={i === 0 ? handlePaste : undefined}
                          className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-all bg-white dark:bg-slate-700 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === "confirm" && (
                <>
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-2 text-center">
                    Confirma tu código
                  </h2>
                  <p className="text-sm text-gray-400 dark:text-slate-500 text-center mb-6">
                    Ingresa nuevamente el código de 4 dígitos.
                  </p>

                  {error && (
                    <p className="text-red-500 dark:text-red-400 text-sm text-center mb-4">{error}</p>
                  )}

                  <div id="pin-inputs" className="flex flex-col items-center gap-2 mb-6">
                    <div className="flex gap-2 justify-center">
                      {confirmDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => { confirmInputRefs.current[i] = el; }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleConfirmChange(i, e.target.value)}
                          onKeyDown={(e) => handleConfirmKeyDown(i, e)}
                          className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-all bg-white dark:bg-slate-700 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleRetry}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || confirmDigits.some((d) => !d)}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all"
                    >
                      {submitting ? "Configurando..." : "Confirmar"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {step === "done" && (
          <div className="w-full backdrop-blur-sm p-8 rounded-3xl shadow-xl dark:shadow-slate-900/50 border border-white/40 dark:border-slate-700/40 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Código configurado</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Tu código de acceso ha sido creado correctamente.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Redirigiendo al inicio...</p>
          </div>
        )}
      </main>

      <footer className="mt-12 text-center">
        <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400 font-bold opacity-40">PWA v{APP_VERSION}</span>
      </footer>
    </div>
  );
}
