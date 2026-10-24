
import { useState } from "react";
import {
  X,
  Bot,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function CreateBotPopup({
  onClose,
  onConfirm,
  submitting = false,
  createdBotId = null,
  onContinueWorkflow,
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [savedBotId, setSavedBotId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a bot name.");
      return;
    }

    try {
      // Parent se created bot ki response receive karein.
      const result = await onConfirm({
        name: name.trim(),
      });

      const botId =
        result?.data?.id ??
        result?.id ??
        result?.data?.data?.id ??
        createdBotId;

      setSavedBotId(botId ?? null);
      setCreated(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Unable to create bot."
      );
    }
  };

  const handleContinue = () => {
    if (onContinueWorkflow && (savedBotId || createdBotId)) {
      onContinueWorkflow(savedBotId || createdBotId);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/15">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-green-100 px-6 py-6 sm:px-8">
          <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-emerald-200/30" />
          <div className="absolute -bottom-20 right-20 h-36 w-36 rounded-full bg-green-200/30" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg shadow-emerald-700/20">
                {created ? (
                  <CheckCircle2 size={30} />
                ) : (
                  <Bot size={30} strokeWidth={1.8} />
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">
                  {created ? "Bot Created Successfully!" : "Create Your Bot"}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  {created
                    ? "Your bot is ready. Continue to build your workflow."
                    : "Enter your bot name to get started."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close modal"
              className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-emerald-700 hover:shadow-sm disabled:opacity-50"
            >
              <X size={21} />
            </button>
          </div>
        </div>

        {created ? (
          /* Success message and workflow link */
          <div className="space-y-5 px-6 py-7 sm:px-8">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2
                size={22}
                className="mt-0.5 shrink-0 text-emerald-600"
              />

              <div>
                <p className="font-semibold text-emerald-900">
                  Bot successfully created!
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  Click below to continue and configure your bot workflow.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleContinue}
                disabled={!(savedBotId || createdBotId) || !onContinueWorkflow}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:from-emerald-700 hover:to-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue Workflow
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          /* Create bot form */
          <form
            onSubmit={handleSubmit}
            className="space-y-6 px-6 py-7 sm:px-8"
          >
            <div>
              <label
                htmlFor="bot-name"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Bot Name <span className="text-red-500">*</span>
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
                <Bot size={20} className="shrink-0 text-emerald-600" />

                <input
                  id="bot-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="e.g. Customer Support Bot"
                  maxLength={255}
                  required
                  autoFocus
                  disabled={submitting}
                  className="w-full border-0 bg-transparent py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
                />
              </div>

              <div className="mt-1.5 flex justify-end">
                <span className="text-xs text-slate-400">
                  {name.length}/255
                </span>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-700/20 transition hover:from-emerald-700 hover:to-green-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {submitting ? "Saving Bot..." : "Save Bot"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
