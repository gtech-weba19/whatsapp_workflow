
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  X,
  Smartphone,
  KeyRound,
  LoaderCircle,
} from "lucide-react";

import { ToastContainer } from "react-toastify";


export default function AdminWhatsAppEditModal({
  account,
  onClose,
  onSave,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    sender_number: "",
    api_token: "",
  });

  useEffect(() => {
    if (account) {
      setForm({
        sender_number:
          account.sender_number || account.waba_id || "",
        api_token: "",
      });
      setError("");
    }
  }, [account]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.sender_number.trim()) {
      setError("Please enter WhatsApp number.");
      return;
    }

    const mobileNumber = form.sender_number.replace(/\D/g, "");

    if (mobileNumber.length < 10 || mobileNumber.length > 15) {
      setError(
        "Please enter a valid WhatsApp number with country code."
      );
      return;
    }

    const payload = {
      user_id: account.user_id ?? account.user?.id,
      name: account.name || "",
      provider: account.provider || "meta",
      business_name: account.business_name || "",
      waba_id: mobileNumber,
      sender_name: account.sender_name || "Whatsappdemo",
      webhook_dn_id: String(account.webhook_dn_id ?? "1001"),
      status: account.status || "pending",
    };

    if (form.api_token.trim()) {
      payload.access_token = form.api_token.trim();
    }

    setLoading(true);

  try {
        await onSave(payload);

        toast.success("WhatsApp account updated successfully.", {
            position: "top-right",
            autoClose: 3000,
            theme: "colored",
        });

        onClose();
        } catch (submitError) {
        const message =
            submitError.response?.data?.message ||
            submitError.message ||
            "Unable to update WhatsApp account.";

        setError(message);

        toast.error(message, {
            position: "top-right",
            autoClose: 4000,
            theme: "colored",
        });
        } finally {
        setLoading(false);
        }
  };

  if (!account) return null;

  return (
    <>

    <ToastContainer
    position="top-center"
    autoClose={3000}
    newestOnTop
    closeOnClick
    pauseOnHover
    theme="colored"
    />
     
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Edit WhatsApp Account
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Update the selected user's WhatsApp credentials.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              WhatsApp Number
            </label>

            <div className="relative">
              <Smartphone
                size={17}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                type="tel"
                name="sender_number"
                value={form.sender_number}
                onChange={handleChange}
                placeholder="919876543210"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              API Key / Token
            </label>

            <div className="relative">
              <KeyRound
                size={17}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                type="password"
                name="api_token"
                value={form.api_token}
                onChange={handleChange}
                placeholder="Enter new API key only if changing it"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Leave blank to keep the existing API key unchanged.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-500/20 transition-all duration-200 hover:from-emerald-600 hover:to-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              {loading ? "Updating..." : "Update Account"}
            </button>
          </div>

        </form>
      </div>
    </div>
    </>
  );
}
