import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface IosInstallGuideProps {
  variant?: "full" | "compact";
}

const STEPS = [
  {
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    label: "Abre en Safari",
    detail: "Asegúrate de estar usando Safari, no otra app.",
  },
  {
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    label: "Toca Compartir",
    detail: "El botón con el cuadrado y flecha arriba, en la barra inferior.",
  },
  {
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    label: "Agregar a Inicio",
    detail: "Desplázate y elige 'Agregar a la pantalla de inicio'.",
  },
  {
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: "Confirma",
    detail: "Toca 'Agregar' en la esquina superior derecha.",
  },
];

const IosInstallGuide: React.FC<IosInstallGuideProps> = ({ variant = "full" }) => {
  const { isIOS, isInstalled } = useInstallPrompt();

  if (!isIOS || isInstalled) return null;

  if (variant === "compact") {
    return (
      <details className="text-xs text-gray-500 dark:text-slate-400 text-center">
        <summary className="cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
          ¿Cómo instalar en iPhone?
        </summary>
        <div className="mt-2 text-left space-y-1.5">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-gray-600 dark:text-slate-300">{step.label}</span>
            </div>
          ))}
        </div>
      </details>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm dark:shadow-slate-900/50">
      <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
        Instalar en iPhone
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Para usar la app desde tu pantalla de inicio sin necesidad de abrir Safari:
      </p>
      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{step.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default IosInstallGuide;
