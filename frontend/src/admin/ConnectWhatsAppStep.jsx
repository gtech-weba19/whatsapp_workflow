
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  MessageCircle,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

export default function ConnectWhatsAppStep({
  onBack,
  onConnected,
}) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    provider: "instaalerts",
    api_url: "",
    api_token: "",
    sender_number: "",
    sender_name: "",
    webhook_dn_id: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleConnect = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (
      !form.api_url.trim() ||
      !form.api_token.trim() ||
      !form.sender_number.trim()
    ) {
      toast.warning(
        "Please enter the API URL, API token and sender number."
      );
      return;
    }

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("auth_token") ||
      sessionStorage.getItem("access_token");

    if (!token) {
      toast.error("Please log in again to continue.");
      return;
    }

    setLoading(true);

    try {
      /*
       * IMPORTANT:
       * This endpoint must exist in your Laravel backend.
       * Change the URL if your actual connection endpoint differs.
       *
       * Never send provider credentials to a public frontend
       * endpoint that does not store them securely server-side.
       */
      const response = await axios.post(
        `${API}/whatsapp-accounts/connect`,
        {
          provider: form.provider,
          api_url: form.api_url.trim(),
          api_token: form.api_token.trim(),
          sender_number: form.sender_number.trim(),
          sender_name: form.sender_name.trim(),
          webhook_dn_id: form.webhook_dn_id.trim(),
        },
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      const result = response.data;

      if (result?.connected === false || result?.success === false) {
        throw new Error(
          result?.message || "WhatsApp connection was unsuccessful."
        );
      }

      // Continue only after the backend accepts the connection.
      toast.success(
        result?.message || "WhatsApp account connected successfully."
      );

      if (typeof onConnected === "function") {
        await onConnected(result);
      }
    } catch (error) {
      console.error(
        "WhatsApp connection error:",
        error?.response?.data || error.message
      );

      const validationErrors = error?.response?.data?.errors;

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          (validationErrors
            ? Object.values(validationErrors).flat().join(" ")
            : null) ||
          error.message ||
          "Unable to connect WhatsApp. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60";

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <MessageCircle size={28} />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Connect WhatsApp
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Add your WhatsApp provider credentials to connect your
          business messaging account.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={21}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Secure account connection
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your Laravel backend should store provider credentials
                securely and associate this account with the authenticated
                tenant.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleConnect} className="space-y-5 p-5 sm:p-7">
          <div>
            <label
              htmlFor="provider"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              WhatsApp provider
            </label>

            <select
              id="provider"
              name="provider"
              value={form.provider}
              onChange={handleChange}
              disabled={loading}
              className={inputClass}
            >
              <option value="instaalerts">InstaAlerts</option>
              <option value="meta">Meta WhatsApp Cloud API</option>
              <option value="other">Other provider</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="api_url"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Provider API URL *
            </label>

            <input
              id="api_url"
              name="api_url"
              type="url"
              value={form.api_url}
              onChange={handleChange}
              placeholder="https://provider.example/api"
              required
              disabled={loading}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="api_token"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              API token *
            </label>

            <input
              id="api_token"
              name="api_token"
              type="password"
              value={form.api_token}
              onChange={handleChange}
              placeholder="Enter your provider API token"
              autoComplete="new-password"
              required
              disabled={loading}
              className={inputClass}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="sender_number"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                WhatsApp sender number *
              </label>

              <input
                id="sender_number"
                name="sender_number"
                type="tel"
                value={form.sender_number}
                onChange={handleChange}
                placeholder="919876543210"
                required
                disabled={loading}
                className={inputClass}
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Include the country code.
              </p>
            </div>

            <div>
              <label
                htmlFor="sender_name"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Sender name
              </label>

              <input
                id="sender_name"
                name="sender_name"
                type="text"
                value={form.sender_name}
                onChange={handleChange}
                placeholder="Your business name"
                disabled={loading}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="webhook_dn_id"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Provider webhook ID
            </label>

            <input
              id="webhook_dn_id"
              name="webhook_dn_id"
              type="text"
              value={form.webhook_dn_id}
              onChange={handleChange}
              placeholder="Optional provider ID"
              disabled={loading}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              Back to plans
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect and continue
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs leading-5 text-slate-400">
        <CheckCircle2 size={15} />
        Your connection status should be verified by the server.
      </p>
    </section>
  );
}
