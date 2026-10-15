import { Check } from "lucide-react";

const STEPS = [
  { label: "Create Account", path: "/register" },
  { label: "Choose Plan", path: "/plans" },
  { label: "Connect WhatsApp", path: "/connect-whatsapp" },
];

export default function SignupProgress({ currentStep = 1 }) {
  const activeStep = Math.min(3, Math.max(1, Number(currentStep) || 1));

  return (
    <div className="mb-6 w-full">
      {/* Heading */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            Get started
          </span>

          <span className="h-1 w-1 rounded-full bg-slate-300" />

          <span className="text-xs font-medium text-slate-500">
            Step {activeStep} of {STEPS.length}
          </span>
        </div>

        <span className="text-xs font-semibold text-emerald-700">
          {Math.round((activeStep / STEPS.length) * 100)}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Signup progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={activeStep}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500 ease-out"
          style={{
            width: `${(activeStep / STEPS.length) * 100}%`,
          }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-3 gap-2">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < activeStep;
          const isActive = stepNumber === activeStep;

          return (
            <div key={step.path} className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 ${
                    isCompleted
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isActive
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-50"
                      : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check size={14} /> : stepNumber}
                </div>

                {index < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 ${
                      isCompleted ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>

              <p
                className={`text-[10px] leading-4 sm:text-xs ${
                  isActive
                    ? "font-bold text-emerald-800"
                    : isCompleted
                    ? "font-medium text-slate-600"
                    : "font-medium text-slate-400"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}