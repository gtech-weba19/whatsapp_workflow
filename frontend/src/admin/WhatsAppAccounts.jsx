import { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";

import { getStoredUser, isSuperAdmin } from "../utils/permission";

import {

  Plus,

  Search,

  RefreshCw,

  Pencil,

  Trash2,

  X,

  Loader2,

  Phone,

  Smartphone,

  Building2,

  CheckCircle2,

  Clock3,

  Unplug,

  ShieldCheck,

  Eye,

  EyeOff,

  ChevronDown,

  AlertCircle,

} from "lucide-react";



/* =========================================================

   API CONFIGURATION

========================================================= */



const API_BASE_URL = (

  import.meta.env.VITE_API_URL || "http://localhost:8000/api"

).replace(/\/+$/, "");



const ACCOUNT_URL = `${API_BASE_URL}/whatsapp-accounts`;

const CLIENT_URL = `${API_BASE_URL}/clients`;





/* =========================================================

   AXIOS

========================================================= */



const api = axios.create({

  headers: {

    Accept: "application/json",

    "Content-Type": "application/json",

  },

});



api.interceptors.request.use((config) => {

  const token =

    localStorage.getItem("token") ||

    localStorage.getItem("auth_token") ||

    localStorage.getItem("access_token");



  if (token) {

    config.headers = config.headers || {};

    config.headers.Authorization = `Bearer ${token}`;

  }



  return config;

});



/* =========================================================

   DEFAULT VALUES

========================================================= */



const EMPTY_ACCOUNT = {

  name: "",

  provider: "meta",

  business_name: "",

  waba_id: "",

  access_token: "",

  sender_name: "Whatsappdemo",

  webhook_dn_id: "1001",

  status: "pending",

};



/* =========================================================

   GENERAL HELPERS

========================================================= */



function getRows(response) {

  const payload = response?.data;



  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.data)) return payload.data;

  if (Array.isArray(payload?.data?.data)) return payload.data.data;

  if (Array.isArray(payload?.items)) return payload.items;

  if (Array.isArray(payload?.results)) return payload.results;



  return [];

}





function getErrorMessage(error, fallback = "Something went wrong.") {

  const data = error?.response?.data;



  if (data?.errors) {

    const firstError = Object.values(data.errors)

      .flat()

      .find(Boolean);



    if (firstError) return String(firstError);

  }



  return data?.message || data?.error || error?.message || fallback;

}



function getStatus(item) {

  return String(item?.status || "pending").toLowerCase();

}



function getClientName(account, clients) {

  if (account?.client?.name) return account.client.name;

  if (account?.tenant?.name) return account.tenant.name;

  if (account?.client_name) return account.client_name;

  if (account?.tenant_name) return account.tenant_name;



  const userId =

    account?.user_id ??

    account?.client_id;



  const client = clients.find(

    (item) => String(item.id) === String(userId)

  );



  return (

    client?.name ||

    client?.business_name ||

    client?.email ||

    (client?.id ? `User #${client.id}` : "Unassigned")

  );

}

function formatStatus(status) {

  return String(status || "pending")

    .replaceAll("_", " ")

    .replace(/\b\w/g, (letter) => letter.toUpperCase());

}



function cx(...classes) {

  return classes.filter(Boolean).join(" ");

}



function getStatusStyle(status) {

  switch (String(status || "").toLowerCase()) {

    case "connected":

    case "active":

    case "approved":

    case "success":

      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";



    case "disconnected":

    case "inactive":

    case "failed":

    case "error":

    case "rejected":

      return "bg-rose-50 text-rose-700 ring-rose-600/20";



    case "pending":

    case "processing":

      return "bg-amber-50 text-amber-700 ring-amber-600/20";



    default:

      return "bg-slate-100 text-slate-700 ring-slate-500/20";

  }

}



/* =========================================================

   REUSABLE UI

========================================================= */



const inputClass =

  "block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";



const selectClass = inputClass;



function Field({ label, children, required = false, hint = "", className = "" }) {

  return (

    <div className={cx("min-w-0 space-y-1.5", className)}>

      <label className="block text-sm font-medium text-slate-700">

        {label}

        {required && <span className="ml-1 text-rose-500">*</span>}

      </label>

      {children}

      {hint && <p className="text-xs text-slate-500">{hint}</p>}

    </div>

  );

}



function StatusBadge({ status }) {

  return (

    <span

      className={cx(

        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",

        getStatusStyle(status)

      )}

    >

      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {formatStatus(status)}

    </span>

  );

}



function AlertMessage({ message, type = "error", onClose }) {

  if (!message) return null;



  const isError = type === "error";



  return (

    <div

      role="alert"

      className={cx(

        "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",

        isError

          ? "border-rose-200 bg-rose-50 text-rose-700"

          : "border-emerald-200 bg-emerald-50 text-emerald-700"

      )}

    >

      <AlertCircle size={17} className="mt-0.5 shrink-0" />

      <p className="min-w-0 flex-1 break-words">{message}</p>

      {onClose && (

        <button

          type="button"

          onClick={onClose}

          className="shrink-0 rounded-lg p-0.5 hover:bg-black/5"

          aria-label="Dismiss message"

        >

          <X size={16} />

        </button>

      )}

    </div>

  );

}



function StatCard({ label, value, icon: Icon, color = "indigo" }) {

  const colors = {

    indigo: {

      icon: "bg-indigo-50 text-indigo-600",

      accent: "bg-indigo-500",

    },

    emerald: {

      icon: "bg-emerald-50 text-emerald-600",

      accent: "bg-emerald-500",

    },

    amber: {

      icon: "bg-amber-50 text-amber-600",

      accent: "bg-amber-500",

    },

    rose: {

      icon: "bg-rose-50 text-rose-600",

      accent: "bg-rose-500",

    },

  };



  const theme = colors[color] || colors.indigo;



  return (

    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">

      <div className={`absolute inset-x-0 top-0 h-1 ${theme.accent}`} />

      <div className="flex items-center justify-between gap-4">

        <div className="min-w-0">

          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">

            {value}

          </p>

          <p className="mt-2 text-xs text-slate-400">Current account overview</p>

        </div>

        <div

          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${theme.icon}`}

        >

          <Icon size={23} strokeWidth={1.8} />

        </div>

      </div>

    </div>

  );

}



function ModalHeader({ title, subtitle, onClose, icon: Icon }) {

  return (

    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">

      <div className="flex min-w-0 items-start gap-3">

        {Icon && (

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

            <Icon size={21} />

          </div>

        )}

        <div className="min-w-0">

          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          {subtitle && (

            <p className="mt-1 break-words text-sm text-slate-500">

              {subtitle}

            </p>

          )}

        </div>

      </div>



      <button

        type="button"

        onClick={onClose}

        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"

        aria-label="Close modal"

      >

        <X size={19} />

      </button>

    </div>

  );

}



function ModalFooter({ onCancel, saving, submitLabel }) {

  return (

    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

      <button

        type="button"

        onClick={onCancel}

        disabled={saving}

        className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"

      >

        Cancel

      </button>



      <button

        type="submit"

        form="whatsapp-modal-form"

        disabled={saving}

        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"

      >

        {saving && <Loader2 size={16} className="animate-spin" />}

        {saving ? "Saving..." : submitLabel}

      </button>

    </div>

  );

}





/* =========================================================

   ACCOUNT CREATE / EDIT MODAL

========================================================= */



function AccountModal({

  open,

  close,

  save,

  clients = [],

  editing,

  saving,

  isAdmin = true,

  currentUser = null,

}) {

  const [form, setForm] = useState({ ...EMPTY_ACCOUNT });

  const [error, setError] = useState("");

  const [showToken, setShowToken] = useState(false);



  useEffect(() => {

    if (!open) return;



    setError("");

    setShowToken(false);



const defaultUserId =

  editing?.user_id ??

  editing?.user?.id ??

  currentUser?.id ??

  "";



const selectedUser = clients.find(

  (client) => String(client.id) === String(defaultUserId)

);



const businessName =

  selectedUser?.business_name ||

  selectedUser?.business_profile?.business_name ||

  selectedUser?.businessProfile?.business_name ||

  editing?.business_name ||

  "";



    setForm({

      ...EMPTY_ACCOUNT,

      ...(editing || {}),

      user_id: String(defaultUserId),

      name: editing?.name ?? "",

      provider: editing?.provider ?? "meta",

      business_name: businessName,

      waba_id: editing?.waba_id ?? "",

      access_token: "",

      sender_name: editing?.sender_name ?? "Whatsappdemo",

      webhook_dn_id: String(editing?.webhook_dn_id ?? "1001"),

      status: editing?.status ?? "pending",

    });

  }, [open, editing, currentUser, clients]);



  if (!open) return null;



  const update = (key, value) => {

    setForm((previous) => ({

      ...previous,

      [key]: value,

    }));

  };



const handleUserChange = (userId) => {

  const selectedUser = clients.find(

    (client) => String(client.id ?? client.user_id) === String(userId)

  );



  console.log("Selected user:", selectedUser);



  const businessName =

    selectedUser?.business_name ||

    selectedUser?.business_profile?.business_name ||

    selectedUser?.businessProfile?.business_name ||

    selectedUser?.profile_business_name ||

    "";



  console.log("Selected business name:", businessName);



  setForm((previous) => ({

    ...previous,

    user_id: userId,

    business_name: businessName,

  }));

};



  const handleSubmit = async (event) => {

    event.preventDefault();

    setError("");



    if (!form.name.trim()) {

      setError("Account name is required.");

      return;

    }



    const effectiveUserId = isAdmin

      ? form.user_id

      : currentUser?.id;



    if (!effectiveUserId) {

      setError("Please select a user.");

      return;

    }



const mobileNumber = form.waba_id.replace(/\D/g, "");



if (mobileNumber.length < 10 || mobileNumber.length > 15) {

  setError("Please enter a valid WhatsApp mobile number with country code.");

  return;

}



const payload = {

  user_id: effectiveUserId,

  name: form.name.trim(),

  provider: form.provider,

  business_name: form.business_name.trim(),

  waba_id: mobileNumber,

  sender_name: form.sender_name.trim(),

  webhook_dn_id: String(form.webhook_dn_id ?? "").trim(),

  status: form.status,

};





if (form.access_token.trim()) {

  payload.access_token = form.access_token.trim();

}



if (editing && !form.access_token.trim()) {

  delete payload.access_token;

}



    try {

      await save(payload);

    } catch (submitError) {

      setError(

        getErrorMessage(submitError, "Unable to save account.")

      );

    }

  };



  return (

    <div

      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-5"

      onMouseDown={(event) => {

        if (event.target === event.currentTarget && !saving) {

          close();

        }

      }}

    >

      <section className="relative flex max-h-[92dvh] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        <ModalHeader

          title={

            editing

              ? "Edit WhatsApp Account"

              : "Add WhatsApp Account"

          }

          subtitle={

            editing

              ? "Update account configuration and provider connection details."

              : "Connect a WhatsApp provider account to your platform."

          }

          onClose={close}

          icon={Building2}

        />



        <form

          id="whatsapp-modal-form"

          onSubmit={handleSubmit}

          className="flex min-h-0 flex-1 flex-col overflow-hidden"

        >

          <div className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">

            {error && <AlertMessage message={error} />}



            <div>

              <h3 className="text-sm font-bold text-slate-900">

                Account Details

              </h3>

              <p className="mt-1 text-xs text-slate-500">

                Select a user and configure the WhatsApp account.

              </p>

            </div>



            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {isAdmin ? (

                <Field label="User" required>

                  <select

                    className={selectClass}

                    value={form.user_id}

                    onChange={(event) =>

                      handleUserChange(event.target.value)

                    }

                    required

                  >

                    <option value="">Select user</option>



                    {clients.map((client) => (

                      <option

                        key={client.id}

                        value={client.id}

                      >

                        {client.name || `User #${client.id}`}

                        {client.email ? ` — ${client.email}` : ""}

                        {client.mobile ? ` — ${client.mobile}` : ""}

                      </option>

                    ))}

                  </select>



                  {clients.length === 0 && (

                    <p className="text-xs text-amber-600">

                      No users loaded. Check the /clients API response and permissions.

                    </p>

                  )}

                </Field>

              ) : (

                <Field label="Name">

                  <input

                    className={cx(

                      inputClass,

                      "cursor-not-allowed bg-slate-50 text-slate-600"

                    )}

                    value={currentUser?.name || "My Account"}

                    disabled

                  />

                </Field>

              )}



              <Field label="Account Name" required>

                <input

                  className={inputClass}

                  value={form.name}

                  onChange={(event) =>

                    update("name", event.target.value)

                  }

                  placeholder="Main WhatsApp Account"

                  required

                />

              </Field>



              <Field label="Provider" required>

                <select

                  className={selectClass}

                  value={form.provider}

                  onChange={(event) =>

                    update("provider", event.target.value)

                  }

                  required

                >

                  <option value="meta">

                    Meta WhatsApp Cloud API

                  </option>

                  <option value="wati">WATI</option>

                  <option value="twilio">Twilio</option>

                  <option value="gupshup">Gupshup</option>

                  <option value="custom">Custom Provider</option>

                </select>

              </Field>



           <Field

              label="Business Name"

              hint="Automatically fetched from the selected user's business profile."

            >

              <input

                className={cx(

                  inputClass,

                  "cursor-not-allowed bg-slate-50 text-slate-600"

                )}

                value={form.business_name || ""}

                placeholder="Business name not available"

                readOnly

              />

            </Field>



              <Field label="WhatsApp Business Number">

                <input

                  className={inputClass}

                  value={form.waba_id}

                  onChange={(event) =>

                    update("waba_id", event.target.value)

                  }

                  placeholder="Enter WhatsApp Business Number"

                />

              </Field>



              <Field label="Sender Name">

                <input

                  className={inputClass}

                  value={form.sender_name}

                  onChange={(event) =>

                    update("sender_name", event.target.value)

                  }

                  placeholder="Whatsappdemo"

                />

              </Field>



              <Field label="Webhook DN ID">

                <input

                  className={inputClass}

                  value={form.webhook_dn_id}

                  onChange={(event) =>

                    update("webhook_dn_id", event.target.value)

                  }

                  placeholder="1001"

                />

              </Field>



              <Field

                label="Access Token"

                hint={

                  editing

                    ? "Leave blank to retain the existing token."

                    : "Paste your provider access token."

                }

              >

                <div className="relative">

                  <input

                    className={cx(inputClass, "pr-11")}

                    type={showToken ? "text" : "password"}

                    autoComplete="new-password"

                    value={form.access_token}

                    onChange={(event) =>

                      update("access_token", event.target.value)

                    }

                    placeholder={

                      editing

                        ? "Token already saved"

                        : "Enter access token"

                    }

                  />



                  <button

                    type="button"

                    onClick={() =>

                      setShowToken((value) => !value)

                    }

                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700"

                    aria-label={

                      showToken ? "Hide token" : "Show token"

                    }

                  >

                    {showToken ? (

                      <EyeOff size={17} />

                    ) : (

                      <Eye size={17} />

                    )}

                  </button>

                </div>

              </Field>



               {isAdmin && (

              <Field label="Account Status">

                <select

                  className={selectClass}

                  value={form.status}

                  onChange={(event) =>

                    update("status", event.target.value)

                  }

                >

                  <option value="pending">Pending</option>

                  <option value="connected">Connected</option>

                  <option value="disconnected">Disconnected</option>

                  <option value="inactive">Inactive</option>

                </select>

              </Field>



                )}

            </div>

          </div>



          <ModalFooter

            onCancel={close}

            saving={saving}

            submitLabel={

              editing ? "Update Account" : "Create Account"

            }

          />

        </form>

      </section>

    </div>

  );

}







/* =========================================================

   MAIN WHATSAPP ACCOUNTS PAGE

========================================================= */



/* =========================================================
   CLIENT STEP-BY-STEP WHATSAPP CONNECTION WIZARD
========================================================= */
function UserWhatsAppWizard({ open, close, save, saving, currentUser, editing }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({ waba_id: "", access_token: "" });

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError("");
    setShowToken(false);
    setForm({ waba_id: editing?.waba_id || "", access_token: "" });
  }, [open, editing]);

  if (!open) return null;

  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const steps = [
    { title: "Business number", subtitle: "Step 1 — Enter the WhatsApp Business Number including country code.", icon: Phone },
    { title: "Access token", subtitle: "Step 2 — Add the secure access token to connect your Meta WhatsApp account.", icon: ShieldCheck },
  ];
  const StepIcon = steps[step].icon;

  const next = () => {
    setError("");
    const number = form.waba_id.replace(/\D/g, "");
    if (number.length < 10 || number.length > 15) {
      setError("Enter a valid WhatsApp Business Number with country code (10–15 digits). Example: +91 98765 43210.");
      return;
    }
    setStep(1);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.access_token.trim() && !editing) {
      setError("Please enter your Access Token to connect WhatsApp.");
      return;
    }
    const businessName = currentUser?.business_name || currentUser?.business_profile?.business_name || currentUser?.businessProfile?.business_name || currentUser?.name || "WhatsApp Business";
    const payload = {
      user_id: currentUser?.id,
      name: editing?.name || `${businessName} WhatsApp`,
      provider: "meta",
      business_name: businessName,
      // Keep the existing backend field name; only the frontend label is changed.
      waba_id: form.waba_id.replace(/\D/g, ""),
      sender_name: editing?.sender_name || "Whatsappdemo",
      webhook_dn_id: String(editing?.webhook_dn_id ?? "1001"),
      status: editing?.status || "pending",
    };
    if (form.access_token.trim()) payload.access_token = form.access_token.trim();
    try {
      await save(payload);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save WhatsApp account. Please check your details and try again."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) close(); }}>
      <section className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 animate-pulse rounded-full bg-emerald-300/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 animate-pulse rounded-full bg-teal-300/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 animate-pulse items-center justify-center rounded-2xl border border-white/20 bg-white/10"><Smartphone size={25} /></div>
              <div>
                <div className="mb-2 inline-flex animate-pulse items-center gap-2 rounded-full border border-emerald-200/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"><span className="h-2 w-2 animate-ping rounded-full bg-lime-300" /> Guided setup</div>
                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{editing ? "Update WhatsApp connection" : "Connect your WhatsApp"}</h2>
                <p className="mt-1 max-w-lg text-sm text-emerald-50/85">Only two details needed. Meta and other defaults are configured automatically.</p>
              </div>
            </div>
            <button type="button" onClick={close} disabled={saving} aria-label="Close wizard" className="rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white disabled:opacity-50"><X size={20} /></button>
          </div>
          <div className="relative mt-7 grid grid-cols-2 gap-3">
            {steps.map((item, index) => <div key={item.title} className="min-w-0">
              <div className={`mb-2 h-1.5 overflow-hidden rounded-full ${index <= step ? "bg-lime-300" : "bg-white/20"}`}><div className={`h-full rounded-full transition-all duration-700 ${index < step ? "w-full bg-lime-200" : index === step ? "w-2/3 bg-white" : "w-0"}`} /></div>
              <div className={`flex items-center gap-2 text-xs font-semibold ${index === step ? "text-white" : index < step ? "text-lime-200" : "text-emerald-100/60"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full border ${index <= step ? "border-lime-200 bg-lime-300/20" : "border-white/25"}`}>{index < step ? <CheckCircle2 size={14} /> : index + 1}</span>{item.title}</div>
            </div>)}
          </div>
        </div>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
            <div key={step} className="animate-in fade-in slide-in-from-right-3 duration-300">
              <div className="mb-6 flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><StepIcon size={22} /></div><div><h3 className="text-lg font-bold text-slate-900">{steps[step].title}</h3><p className="mt-1 text-sm text-slate-500">{steps[step].subtitle}</p></div></div>
              {error && <div className="mb-5"><AlertMessage message={error} /></div>}
              {step === 0 && <div className="space-y-5">
                <Field label="WhatsApp Business Number" required hint="Include country code, for example +91 98765 43210."><div className="relative"><Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" /><input className={cx(inputClass, "pl-11 text-base tracking-wide focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10")} type="tel" inputMode="tel" autoComplete="tel" value={form.waba_id} onChange={(e) => update("waba_id", e.target.value)} placeholder="+91 98765 43210" required autoFocus /></div></Field>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4"><div className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><AlertCircle size={18} /></div><div><p className="text-sm font-bold text-sky-950">Step 1 of 2</p><p className="mt-1 text-xs leading-5 text-sky-800">Enter the business phone number with its country code. We’ll send it to the backend using the existing <code>waba_id</code> field.</p></div></div></div>
              </div>}
              {step === 1 && <div className="space-y-5">
                <Field label="Access Token" required={!editing} hint={editing ? "Leave blank to keep the existing token unchanged." : "Paste the Meta WhatsApp Cloud API access token."}><div className="relative"><ShieldCheck size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" /><input className={cx(inputClass, "pl-11 pr-12 font-mono focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10")} type={showToken ? "text" : "password"} autoComplete="new-password" value={form.access_token} onChange={(e) => update("access_token", e.target.value)} placeholder={editing ? "Leave blank to keep current token" : "Paste Access Token"} required={!editing} autoFocus /><button type="button" onClick={() => setShowToken((value) => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-emerald-700" aria-label={showToken ? "Hide token" : "Show token"}>{showToken ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck size={19} /></div><div><p className="text-sm font-bold text-emerald-950">Defaults are automatic</p><p className="mt-1 text-xs leading-5 text-emerald-800">Provider: <strong>Meta</strong>. Sender Name and Webhook DN ID are set automatically by the system. Your access token is hidden while typing.</p></div></div></div>
              </div>}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button type="button" onClick={() => step === 0 ? close() : setStep(0)} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">{step === 0 ? "Cancel" : "Back"}</button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center"><p className="text-center text-xs text-slate-400">Step {step + 1} of 2</p>{step === 0 ? <button type="button" onClick={next} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20"><CheckCircle2 size={17} /> Continue to Access Token <ChevronDown className="-rotate-90" size={17} /></button> : <button type="submit" disabled={saving} className="inline-flex min-h-11 animate-pulse items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:animate-none hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:animate-none disabled:opacity-60">{saving ? <><Loader2 size={17} className="animate-spin" /> Connecting...</> : <><ShieldCheck size={17} /> {editing ? "Save connection" : "Connect WhatsApp"}</>}</button>}</div>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function WhatsAppAccounts() {

  const currentUser = useMemo(() => getStoredUser(), []);

  const isAdmin = useMemo(() => isSuperAdmin(currentUser), [currentUser]);



  const [accounts, setAccounts] = useState([]);

  const [clients, setClients] = useState([]);



  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");

  const [notice, setNotice] = useState("");



  const [search, setSearch] = useState("");

  const [clientFilter, setClientFilter] = useState("");

  const [statusFilter, setStatusFilter] = useState("");



  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [editingAccount, setEditingAccount] = useState(null);

  const [numbersAccount, setNumbersAccount] = useState(null);

  const [deletingAccountId, setDeletingAccountId] = useState(null);

  const [updatingStatusId, setUpdatingStatusId] = useState(null);



  /* FETCH ACCOUNTS AND USERS */

const fetchData = useCallback(async () => {

  setLoading(true);

  setPageError("");



  try {

    const superAdmin = isSuperAdmin(currentUser);



    // Accounts ko user_id ke basis par filter karein.

    const accountParams = {

      search: search.trim() || undefined,

      user_id: superAdmin ? clientFilter || undefined : undefined,

      status: statusFilter || undefined,

    };



    const accountRequest = api.get(ACCOUNT_URL, {

      params: accountParams,

    });



    // Super admin ke liye users aur unke business profiles load karein.

    const usersRequest = superAdmin

      ? api.get(CLIENT_URL, {

          params: { per_page: 100 },

        })

      : Promise.resolve(null);



    const [accountResponse, usersResponse] = await Promise.all([

      accountRequest,

      usersRequest,

    ]);



    // WhatsApp accounts

    setAccounts(getRows(accountResponse));



    // Users + Business Profile

    if (superAdmin && usersResponse) {

      const users = getRows(usersResponse);



      setClients(

        users.map((user) => ({

          ...user,

          id: user.id ?? user.user_id,

          name: user.name || `User #${user.id ?? user.user_id}`,

          email: user.email || "",

          mobile: user.mobile || "",

          business_name:

            user.business_name ||

            user.business_profile?.business_name ||

            user.businessProfile?.business_name ||

            "",

        }))

      );

    } else if (currentUser) {

      // Normal user ke liye apna user record hi rakhein.

      setClients((previous) => {

        const existingUser = previous.find(

          (item) => String(item.id) === String(currentUser.id)

        );



        return [

          {

            ...existingUser,

            id: currentUser.id,

            name: currentUser.name || "My Account",

            email: currentUser.email || "",

            mobile: currentUser.mobile || "",

            business_name:

              existingUser?.business_name ||

              currentUser.business_name ||

              currentUser.business_profile?.business_name ||

              currentUser.businessProfile?.business_name ||

              "",

          },

        ];

      });

    }

  } catch (fetchError) {

    setPageError(

      getErrorMessage(

        fetchError,

        "Unable to load WhatsApp accounts or users. Check the API URL and backend routes."

      )

    );

  } finally {

    setLoading(false);

  }

}, [search, clientFilter, statusFilter, currentUser]);



useEffect(() => {

  fetchData();

}, [fetchData]);







  useEffect(() => {

    if (!notice) return undefined;



    const timeout = window.setTimeout(() => setNotice(""), 4000);

    return () => window.clearTimeout(timeout);

  }, [notice]);



  /* STATISTICS */



  const stats = useMemo(

    () => ({

      total: accounts.length,

      connected: accounts.filter((item) =>

        ["connected", "active"].includes(getStatus(item))

      ).length,

      pending: accounts.filter((item) => getStatus(item) === "pending").length,

      disconnected: accounts.filter((item) =>

        ["disconnected", "inactive", "failed", "error"].includes(getStatus(item))

      ).length,

    }),

    [accounts]

  );



  // Super Admin can create multiple accounts; each normal client can create only one.
  // The backend must enforce this rule as well.
  const canCreateAccount = isAdmin || accounts.length === 0;

  /* SAVE ACCOUNT */



  const saveAccount = async (payload) => {

    setSaving(true);

    setPageError("");



    try {

      if (editingAccount?.id) {

        await api.put(`${ACCOUNT_URL}/${editingAccount.id}`, payload);

        setNotice("WhatsApp account updated successfully.");

      } else {

        await api.post(ACCOUNT_URL, payload);

        setNotice("WhatsApp account created successfully.");

      }



      setAccountModalOpen(false);

      setEditingAccount(null);

      await fetchData();

    } catch (saveError) {

      setPageError(getErrorMessage(saveError, "Unable to save WhatsApp account."));

      throw saveError;

    } finally {

      setSaving(false);

    }

  };



  const openCreate = () => {
    if (!isAdmin && accounts.length > 0) {
      setPageError("You can create only one WhatsApp account. Please edit your existing account.");
      return;
    }

    setEditingAccount(null);
    setAccountModalOpen(true);
    setPageError("");
  };



  const openEdit = (account) => {

    setEditingAccount(account);

    setAccountModalOpen(true);

    setPageError("");

  };



  const closeAccountModal = () => {

    if (saving) return;

    setAccountModalOpen(false);

    setEditingAccount(null);

  };



  /* UPDATE STATUS */



  const changeStatus = async (account, status) => {

    setUpdatingStatusId(account.id);

    setPageError("");



    try {

      await api.patch(`${ACCOUNT_URL}/${account.id}/status`, { status });

      setNotice("Account status updated successfully.");

      await fetchData();

    } catch (statusError) {

      setPageError(getErrorMessage(statusError, "Unable to update account status."));

    } finally {

      setUpdatingStatusId(null);

    }

  };



  /* DELETE ACCOUNT */



  const removeAccount = async (account) => {

    const confirmed = window.confirm(

      `Are you sure you want to delete "${account.name || "this account"}"?`

    );



    if (!confirmed) return;



    setDeletingAccountId(account.id);

    setPageError("");



    try {

      await api.delete(`${ACCOUNT_URL}/${account.id}`);



      setAccounts((previous) =>

        previous.filter((item) => item.id !== account.id)

      );



      if (numbersAccount?.id === account.id) {

        setNumbersAccount(null);

      }



      setNotice("WhatsApp account deleted successfully.");

    } catch (deleteError) {

      setPageError(getErrorMessage(deleteError, "Unable to delete WhatsApp account."));

    } finally {

      setDeletingAccountId(null);

    }

  };



  /* RENDER */



  return (

    <div className="min-h-screen bg-[#f6f8fc]">

      <div className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">

        {/* PAGE HEADER */}



        <div className="relative w-full rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div className="space-y-1">

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                Communication Platform

              </div>



              <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-3xl">
                {isAdmin ? "WhatsApp Account Management" : "Connect Your WhatsApp"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                {isAdmin
                  ? "Create and manage WhatsApp accounts for your clients from one place."
                  : accounts.length > 0
                    ? "Your WhatsApp account is connected to your workspace. You can view or update its settings below."
                    : "Connect your business WhatsApp account to start using your journeys and automated messages."}
              </p>

            </div>



            <div className="flex flex-wrap items-center gap-2">

              <button

                type="button"

                onClick={fetchData}

                disabled={loading}

                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"

              >

                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />

                Refresh

              </button>



              {canCreateAccount && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  <Plus size={17} />
                  {isAdmin ? "Add WhatsApp Account" : "Connect WhatsApp Account"}
                </button>
              )}

            </div>

          </div>

        </div>



        {/* ALERTS */}



        {pageError && (

          <AlertMessage message={pageError} onClose={() => setPageError("")} />

        )}



        {notice && (

          <AlertMessage

            message={notice}

            type="success"

            onClose={() => setNotice("")}

          />

        )}



        {!isAdmin && !loading && (
          <div className={`rounded-2xl border p-4 sm:p-5 ${accounts.length > 0 ? "border-emerald-200 bg-emerald-50/70" : "border-sky-200 bg-sky-50/70"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accounts.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                {accounts.length > 0 ? <CheckCircle2 size={20} /> : <Smartphone size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900">
                  {accounts.length > 0 ? "WhatsApp account added" : "Connect your business WhatsApp"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {accounts.length > 0
                    ? "Client workspaces can have one WhatsApp account. Use Edit or Manage Numbers on your existing account to update it; a second account cannot be added."
                    : "Add your WhatsApp account below. After it is added, you can edit or manage its WhatsApp numbers from this page."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STATISTICS */}



        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard label="Total Accounts" value={stats.total} icon={Building2} color="indigo" />

          <StatCard label="Connected" value={stats.connected} icon={CheckCircle2} color="emerald" />

          <StatCard label="Pending" value={stats.pending} icon={Clock3} color="amber" />

          <StatCard label="Disconnected" value={stats.disconnected} icon={Unplug} color="rose" />

        </div>



        {/* TABLE CARD */}



        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">

            <div>

              <h2 className="font-bold text-slate-900">{isAdmin ? "All Client Accounts" : "Your WhatsApp Account"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isAdmin
                  ? "View and manage WhatsApp accounts across your client workspaces."
                  : "View your account details, update settings, or manage linked WhatsApp numbers."}
              </p>

            </div>



            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">

              <div className="relative min-w-0 sm:min-w-[220px]">

                <Search

                  size={17}

                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"

                />

                <input

                  type="search"

                  value={search}

                  onChange={(event) => setSearch(event.target.value)}

                  placeholder="Search accounts..."

                  className={cx(inputClass, "pl-10")}

                />

              </div>



              {isAdmin && (

                <select

                  value={clientFilter}

                  onChange={(event) => setClientFilter(event.target.value)}

                  className={cx(selectClass, "sm:min-w-[220px]")}

                >

                  <option value="">All users</option>

                  {clients.map((client) => (

                    <option key={client.id} value={client.id}>

                      {client.name || `User #${client.id}`}

                      {client.email ? ` — ${client.email}` : ""}

                    </option>

                  ))}

                </select>

              )}



              <select

                value={statusFilter}

                onChange={(event) => setStatusFilter(event.target.value)}

                className={cx(selectClass, "sm:min-w-[155px]")}

              >

                <option value="">All statuses</option>

                <option value="connected">Connected</option>

                <option value="active">Active</option>

                <option value="pending">Pending</option>

                <option value="disconnected">Disconnected</option>

                <option value="inactive">Inactive</option>

                <option value="error">Error</option>

              </select>

            </div>

          </div>



          {/* ACCOUNTS TABLE */}



          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px] divide-y divide-slate-200 text-left">

              <thead className="bg-slate-50/80">

                <tr>

                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">

                    Account

                  </th>

                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">

                    Name

                  </th>

                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">

                    Provider

                  </th>



                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">

                    Status

                  </th>

                  {isAdmin && (

                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-500">

                    Update Status

                  </th>

                )}

                  <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-slate-500">

                    Actions

                  </th>

                </tr>

              </thead>



              <tbody className="divide-y divide-slate-100 bg-white">

                {loading ? (

                  <tr>

                    <td colSpan={7} className="px-5 py-16 text-center">

                      <Loader2 size={28} className="mx-auto animate-spin text-indigo-600" />

                      <p className="mt-3 text-sm text-slate-500">

                        Loading WhatsApp accounts...

                      </p>

                    </td>

                  </tr>

                ) : accounts.length === 0 ? (

                  <tr>

                    <td colSpan={7} className="px-5 py-16 text-center">

                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

                        <Smartphone size={26} />

                      </div>

                      <h3 className="mt-4 font-bold text-slate-900">

                        No WhatsApp accounts found

                      </h3>

                      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">

                        Add a WhatsApp account or change your search and filters.

                      </p>

                      {canCreateAccount && (
                        <button
                          type="button"
                          onClick={openCreate}
                          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
                        >
                          <Plus size={16} />
                          Add WhatsApp Account
                        </button>
                      )}

                    </td>

                  </tr>

                ) : (

                  accounts.map((account) => (

                    <tr key={account.id} className="transition hover:bg-slate-50/70">

                      <td className="px-5 py-4">

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                            <Building2 size={19} />

                          </div>

                          <div className="min-w-0">

                            <p className="max-w-[220px] truncate font-semibold text-slate-900">

                              {account.name || "Unnamed account"}

                            </p>

                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">

                              {account.business_name || "No business name"}

                            </p>

                          </div>

                        </div>

                      </td>



                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-700">

                          <Building2 size={15} className="shrink-0 text-slate-400" />

                          <span className="max-w-[180px] truncate">

                            {getClientName(account, clients)}

                          </span>

                        </div>

                      </td>



                      <td className="px-5 py-4">

                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold capitalize text-slate-700">

                          {String(account.provider || "meta").replaceAll("_", " ")}

                        </span>

                      </td>







                      <td className="px-5 py-4">

                        <StatusBadge status={account.status} />

                      </td>



                      {isAdmin && (



                      <td className="px-5 py-4">

                        <div className="relative min-w-[145px]">

                          {updatingStatusId === account.id ? (

                            <div className="flex items-center gap-2 text-xs text-slate-500">

                              <Loader2 size={14} className="animate-spin" />

                              Updating...

                            </div>

                          ) : (

                            <>

                              <select

                                value={getStatus(account)}

                                onChange={(event) =>

                                  changeStatus(account, event.target.value)

                                }

                                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"

                                aria-label={`Change status for ${account.name}`}

                              >

                                <option value="pending">Pending</option>

                                <option value="connected">Connected</option>

                                <option value="disconnected">Disconnected</option>

                                <option value="inactive">Inactive</option>

                              </select>

                              <ChevronDown

                                size={14}

                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"

                              />

                            </>

                          )}

                        </div>

                      </td>



                        )}



                      <td className="px-5 py-4">

                        <div className="flex items-center justify-end gap-1.5">





                          <button

                            type="button"

                            onClick={() => openEdit(account)}

                            title="Edit account"

                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"

                          >

                            <Pencil size={16} />

                          </button>



                          <button

                            type="button"

                            onClick={() => removeAccount(account)}

                            disabled={deletingAccountId === account.id}

                            title="Delete account"

                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"

                          >

                            {deletingAccountId === account.id ? (

                              <Loader2 size={16} className="animate-spin" />

                            ) : (

                              <Trash2 size={16} />

                            )}

                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>



          <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-5 py-3.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">

            <span>

              Showing {accounts.length} account{accounts.length === 1 ? "" : "s"}

            </span>

            <span className="inline-flex items-center gap-1.5">

              <ShieldCheck size={14} className="text-emerald-600" />

              WhatsApp account management

            </span>

          </div>

        </div>

      </div>



      {/* ACCOUNT MODAL */}



      {isAdmin ? (
        <AccountModal
          open={accountModalOpen}
          close={closeAccountModal}
          save={saveAccount}
          clients={clients}
          editing={editingAccount}
          saving={saving}
          isAdmin={isAdmin}
          currentUser={currentUser}
        />
      ) : (
        <UserWhatsAppWizard
          open={accountModalOpen}
          close={closeAccountModal}
          save={saveAccount}
          editing={editingAccount}
          saving={saving}
          currentUser={currentUser}
        />
      )}

      {/* NUMBERS MODAL */}



      {numbersAccount && (

        <WhatsAppNumbersModal

          account={numbersAccount}

          close={() => setNumbersAccount(null)}

          notify={(message, type = "success") => {

            setNotice(message);

            setPageError("");

          }}

        />

      )}

    </div>

  );

}
