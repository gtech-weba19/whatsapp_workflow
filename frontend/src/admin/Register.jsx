import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

import {
  Mail,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Headset,
  UserRound,
  Building2,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Globe,
  MapPin,
  FileText,
  CreditCard,
  LockKeyhole,
  Check,
  Upload,
} from "lucide-react";

import "react-toastify/dist/ReactToastify.css";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const LOGO = "/WABA Tech Chatbot Logo.png";

const STEPS = [
  { title: "Create Account", subtitle: "Login information" },
  { title: "Business Profile", subtitle: "Company information" },
  { title: "Meta Account", subtitle: "WhatsApp setup" },
  { title: "Documents", subtitle: "Only if required" },
  { title: "Choose Plan", subtitle: "Message credits" },
];

const BUSINESS_TYPES = [
  "Private Limited Company",
  "Public Limited Company",
  "LLP",
  "Proprietorship",
  "Partnership",
  "Individual / Freelancer",
  "Other",
];

const INDUSTRIES = [
  "Retail / E-commerce",
  "Education",
  "Healthcare",
  "Real Estate",
  "Food / Restaurant",
  "Travel / Hospitality",
  "Agency / Marketing",
  "IT & Software",
  "Banking & Finance",
  "Manufacturing",
  "Automobiles",
  "Telecommunications",
  "Logistics & Transportation",
  "Professional Services",
  "Beauty & Wellness",
  "Construction",
  "Media & Entertainment",
  "Non-profit Organization",
  "Other",
];

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Other",
];

const META_OPTIONS = [
  {
    value: "existing",
    icon: CheckCircle2,
    title: "Yes, I already have one",
    description:
      "Connect my existing Meta Business Portfolio or WhatsApp Business Account.",
  },
  {
    value: "new",
    icon: Building2,
    title: "No, help me setting it up",
    description:
      "I need guidance to create or configure my business and WhatsApp account.",
  },
  {
    value: "unsure",
    icon: ShieldCheck,
    title: "I'm not sure",
    description:
      "Show me how to check whether I have a business account.",
  },
  {
    value: "provider",
    icon: ArrowRight,
    title: "Already Using Another Service Provider",
    description:
      "Check whether my existing WhatsApp setup can be connected.",
  },
];

const PLANS = [
  {
    id: "100",
    name: "Free Trial",
    credits: "100",
    price: "0",
    priceLabel: "₹0 to start",
    tag: "TRY IT FREE",
    description: "Explore the platform before upgrading.",
  },
  {
    id: "1000",
    name: "Starter",
    credits: "1000",
    price: "",
    priceLabel: "Price to be configured",
    description: "For small businesses getting started.",
  },
  {
    id: "10000",
    name: "Growth",
    credits: "10000",
    price: "",
    priceLabel: "Price to be configured",
    description: "For growing customer conversations.",
  },
  {
    id: "100000",
    name: "Business",
    credits: "100000",
    price: "",
    priceLabel: "Contact / custom pricing",
    description: "For businesses with higher messaging needs.",
  },
];

const initialForm = {
  name: "",
  email: "",
  mobile: "",
  password: "",
  password_confirmation: "",
  terms: false,

  company_name: "",
  business_type: "",
  industry: "",
  country: "India",
  website: "",
  gstin: "",
  city: "",

  meta_account_type: "existing",

  utility_bill: null,
  gst_document: null,
  document_note: "",
  document_consent: false,

  plan_id: "100",
  billing_consent: false,
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";


const Field = ({
  label,
  name,
  icon: Icon,
  type = "text",
  placeholder = "",
  required = false,
  children,
  form,
  onChange,
  disabled = false,
  error,
  ...props
}) => (
  <div className="min-w-0">
    <label htmlFor={name} className={labelClass}>
      {label}
      {required && <span className="text-rose-500"> *</span>}
    </label>

    <div className="relative">
      {Icon && (
        <Icon
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
      )}

      {children || (
        <input
          {...props}
          id={name}
          name={name}
          type={type}
          value={form?.[name] ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${inputClass} ${Icon ? "pl-10" : ""} ${
            error ? "border-red-400" : ""
          }`}
        />
      )}
    </div>

    {/* Error directly below its input */}
    {error && (
      <p className="mt-1 text-xs font-medium text-red-500">
        {error}
      </p>
    )}
  </div>
);

const SelectField = ({
  label,
  name,
  options,
  placeholder,
  required = false,
  form,
  onChange,
  disabled = false,
  error,
}) => (
  <Field
    label={label}
    name={name}
    required={required}
    form={form}
    onChange={onChange}
    disabled={disabled}
    error={error}
  >
    <select
      id={name}
      name={name}
      value={form?.[name] ?? ""}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={`${inputClass} cursor-pointer ${
        error ? "border-red-400" : ""
      }`}
    >
      <option value="">
        {placeholder || `Select ${label}`}
      </option>

      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </Field>
);



const StepHeading = ({ title, subtitle, icon: Icon }) => (
  <div className="mb-6 flex items-start gap-3.5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
      <Icon size={21} />
    </div>

    <div className="min-w-0">
      <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {subtitle}
      </p>
    </div>
  </div>
);

const Checkbox = ({ name, checked, onChange, children, disabled }) => (
  <label
    className={`mt-5 flex items-start gap-2.5 ${
      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
    }`}
  >
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
    />

    <span className="text-xs leading-5 text-slate-600">{children}</span>
  </label>
);

const InfoBox = ({ children }) => (
  <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs leading-5 text-slate-600">
    <ShieldCheck
      size={17}
      className="mt-0.5 shrink-0 text-blue-600"
    />
    <div>{children}</div>
  </div>
);

const FileUpload = ({
  label,
  description,
  name,
  file,
  onChange,
  disabled,
}) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 transition hover:border-emerald-400">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
      <Upload size={19} />
    </div>

    <h3 className="mt-3 text-sm font-bold text-slate-800">{label}</h3>

    <p className="mt-1 min-h-[40px] text-xs leading-5 text-slate-500">
      {description}
    </p>

    <label
      htmlFor={name}
      className={`mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-slate-50"
      }`}
    >
      <Upload size={14} />
      {file ? "Change file" : "Choose file"}
    </label>

    <input
      id={name}
      name={name}
      type="file"
      accept=".pdf,.jpg,.jpeg,.png,.webp"
      onChange={onChange}
      disabled={disabled}
      className="sr-only"
    />

    <p className="mt-2 break-all text-[11px] text-slate-400">
      {file ? file.name : "PDF, JPG, PNG or WEBP · Max 5 MB"}
    </p>
  </div>
);


/* =========================================================
   REGISTER PAGE
========================================================= */

const Register = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...initialForm });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});

  const selectedPlan =
    PLANS.find((plan) => String(plan.id) === String(form.plan_id)) ||
    PLANS[0];

  const updateForm = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage("");

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };


  const checkEmailAvailability = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) return false;

  try {
    const response = await axios.post(`${API}/check-email`, {
      email: normalizedEmail,
    });

    if (!response.data.available) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "Email already taken.",
      }));

      return false;
    }

    setFieldErrors((prev) => ({
      ...prev,
      email: "",
    }));

    return true;
} catch (error) {
  console.error("Email check API failed:", {
    url: `${API}/check-email`,
    status: error.response?.status,
    response: error.response?.data,
    message: error.message,
  });

  const status = error.response?.status;
  const data = error.response?.data;

  let message = "Unable to check email. Please try again.";

  if (status === 422) {
    message =
      data?.errors?.email?.[0] ||
      "Please enter a valid email address.";
  } else if (status === 404) {
    message = "Email check API route not found.";
  } else if (status >= 500) {
    message = "Server error. Please check Laravel logs.";
  } else if (!error.response) {
    message = "Cannot connect to the API. Check the backend URL or CORS.";
  } else if (data?.message) {
    message = data.message;
  }

  setFieldErrors((prev) => ({
    ...prev,
    email: message,
  }));

  return false;
}
};

  /* =========================================================
     INPUT HANDLER
  ========================================================= */

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === "mobile") {
      updateForm(name, value.replace(/\D/g, "").slice(0, 10));
      return;
    }

    if (name === "email") {
      updateForm(name, value.replace(/\s/g, ""));
      return;
    }

    updateForm(name, type === "checkbox" ? checked : value);
  };


const [emailVerified, setEmailVerified] = useState(false);
const [verificationSent, setVerificationSent] = useState(false);
const [emailLoading, setEmailLoading] = useState(false);

const handleVerifyEmail = async () => {
  const email = form.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldErrors((prev) => ({
      ...prev,
      email: "Please enter a valid email address.",
    }));
    return;
  }

  setEmailLoading(true);

  try {
    const response = await axios.post(`${API}/email/send-verification-link`, {
      email,
    });

    if (response.data?.success !== true) {
      toast.error(response.data?.message || "Unable to send verification link.");
      return;
    }

    setVerificationSent(true);
    toast.success("Verification link sent. Please check your email.");
  } catch (error) {
    toast.error(
      error.response?.data?.message ||
        "Unable to send verification link. Please try again."
    );
  } finally {
    setEmailLoading(false);
  }
};
  /* =========================================================
     FILE UPLOAD
  ========================================================= */

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    const file = files?.[0] || null;

    if (!file) {
      updateForm(name, null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a PDF, JPG, PNG or WEBP file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    updateForm(name, file);
  };

  /* =========================================================
     STEP VALIDATION
  ========================================================= */

  const validateStep = (currentStep) => {
    const errors = {};

    if (currentStep === 1) {
      if (!form.name?.trim()) {
        errors.name = "Full name is required.";
      }

      if (!form.email?.trim()) {
        errors.email = "Business email is required.";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      ) {
        errors.email = "Please enter a valid business email.";
      }

      if (!form.mobile?.trim()) {
        errors.mobile = "Mobile number is required.";
      } else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
        errors.mobile = "Enter a valid 10-digit Indian mobile number.";
      }

      if (!form.password) {
        errors.password = "Password is required.";
      } else if (form.password.length < 8) {
        errors.password = "Password must contain at least 8 characters.";
      }

      if (!form.password_confirmation) {
        errors.password_confirmation = "Please confirm your password.";
      } else if (form.password !== form.password_confirmation) {
        errors.password_confirmation = "Passwords do not match.";
      }

      if (!form.terms) {
        errors.terms =
          "Please accept the Terms of Service and Privacy Policy.";
      }
    }

    if (currentStep === 2) {
      if (!form.company_name?.trim()) {
        errors.company_name = "Business name is required.";
      }

      if (!form.business_type) {
        errors.business_type = "Please select a business type.";
      }

      if (!form.industry) {
        errors.industry = "Please select an industry.";
      }

      if (!form.country) {
        errors.country = "Please select a country.";
      }

      if (!form.city?.trim()) {
        errors.city = "City is required.";
      }

      if (form.website?.trim()) {
        try {
          const website = new URL(form.website.trim());

          if (!["http:", "https:"].includes(website.protocol)) {
            errors.website = "Please enter a valid website URL.";
          }
        } catch {
          errors.website = "Enter a valid URL, including https://.";
        }
      }
    }

    if (currentStep === 3 && !form.meta_account_type) {
      errors.meta_account_type =
        "Please select your Meta Business Account status.";
    }

    if (
      currentStep === 4 &&
      (form.utility_bill || form.gst_document) &&
      !form.document_consent
    ) {
      errors.document_consent =
        "Please confirm that you are authorized to share these documents.";
    }

    if (currentStep === 5) {
      if (!form.plan_id) {
        errors.plan_id = "Please select a message-credit plan.";
      }

      if (!form.billing_consent) {
        errors.billing_consent =
          "Please confirm the package and credit usage terms.";
      }
    }

    setFieldErrors((previous) => {
      const next = { ...previous };

      const fieldsByStep = {
        1: [
          "name",
          "email",
          "mobile",
          "password",
          "password_confirmation",
          "terms",
        ],
        2: [
          "company_name",
          "business_type",
          "industry",
          "country",
          "city",
          "website",
        ],
        3: ["meta_account_type"],
        4: ["document_consent"],
        5: ["plan_id", "billing_consent"],
      };

      (fieldsByStep[currentStep] || []).forEach((field) => {
        delete next[field];
      });

      return { ...next, ...errors };
    });

    setErrorMessage("");

    if (Object.keys(errors).length > 0) {
      return "FIELD_ERRORS";
    }

    return "";
  };

  /* =========================================================
     NEXT / BACK
  ========================================================= */

const handleNext = async () => {
  const error = validateStep(step);

  if (error) {
    if (error !== "FIELD_ERRORS") {
      toast.error(error);
    }
    return;
  }

  // Step 1: Check duplicate email before moving to Step 2
  if (step === 1) {
    const emailAvailable = await checkEmailAvailability(form.email);

    if (!emailAvailable) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }
  }

  if (step < 5) {
    setStep((previous) => previous + 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
};

  const handleBack = () => {
    if (step > 1 && !loading) {
      setStep((previous) => previous - 1);
      setErrorMessage("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  /* =========================================================
     FINAL REGISTRATION SUBMIT
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || registrationComplete) {
      return;
    }

    for (let currentStep = 1; currentStep <= 5; currentStep += 1) {
      const validationError = validateStep(currentStep);

      if (validationError) {
        setStep(currentStep);

        if (validationError !== "FIELD_ERRORS") {
          setErrorMessage(validationError);
          toast.warning(validationError);
        }

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const payload = new FormData();

      // STEP 1: ACCOUNT
      payload.append("name", form.name.trim());
      payload.append("email", form.email.trim().toLowerCase());
      payload.append("mobile", form.mobile.trim());
      payload.append("password", form.password);
      payload.append(
        "password_confirmation",
        form.password_confirmation
      );
      payload.append("terms", form.terms ? "1" : "0");

      // STEP 2: BUSINESS
      payload.append("company_name", form.company_name.trim());
      payload.append("business_type", form.business_type);
      payload.append("industry", form.industry);
      payload.append("country", form.country);
      payload.append("website", (form.website || "").trim());
      payload.append("gstin", (form.gstin || "").trim());
      payload.append("city", form.city.trim());

      // STEP 3: META
      payload.append("meta_account_type", form.meta_account_type);

      // STEP 4: DOCUMENTS
      if (form.utility_bill) {
        payload.append("utility_bill", form.utility_bill);
      }

      if (form.gst_document) {
        payload.append("gst_document", form.gst_document);
      }

      payload.append("document_note", (form.document_note || "").trim());
      payload.append(
        "document_consent",
        form.document_consent ? "1" : "0"
      );

      // STEP 5: PLAN
      payload.append("plan_id", form.plan_id);
      payload.append("plan_name", selectedPlan.name);
      payload.append("message_credits", String(selectedPlan.credits));
      payload.append(
        "billing_consent",
        form.billing_consent ? "1" : "0"
      );

      const response = await axios.post(`${API}/register`, payload, {
        headers: {
          Accept: "application/json",
        },
        timeout: 60000,
      });

      const data = response.data;

      const token =
        data?.token ||
        data?.access_token ||
        data?.data?.token ||
        data?.data?.access_token;

      const user = data?.user || data?.data?.user || null;
      const tenant = data?.tenant || data?.data?.tenant || null;

      if (token) {
        [
          "token",
          "access_token",
          "auth_token",
          "user",
          "tenant",
        ].forEach((key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        localStorage.setItem("token", token);

        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        if (tenant) {
          localStorage.setItem("tenant", JSON.stringify(tenant));
        }

        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      }

      if (token || data?.success === true) {
        toast.success(
          data?.message || "Registration submitted successfully!"
        );

        setErrorMessage("");
        setRegistrationComplete(true);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      throw new Error(
        data?.message || "Registration could not be completed."
      );
} catch (error) {
  console.error(
    "Registration error:",
    error.response?.data || error.message
  );

  const data = error.response?.data;
  const errors = data?.errors || {};

  // Clear previous field errors and display current API errors
  const formattedErrors = {};

  Object.entries(errors).forEach(([field, messages]) => {
    formattedErrors[field] = Array.isArray(messages)
      ? messages[0]
      : String(messages);
  });

  setFieldErrors((prev) => ({
    ...prev,
    ...formattedErrors,
  }));

  // Duplicate email or email validation error
  if (errors.email) {
    setStep(1);

    const emailError = Array.isArray(errors.email)
      ? errors.email[0]
      : errors.email;

    setErrorMessage("");

    toast.error(emailError);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    return;
  }

  const validationMessage = Object.values(errors)
    .flat()
    .join(" ");

  const message =
    validationMessage ||
    data?.message ||
    error.message ||
    "Unable to register. Please try again.";

  setErrorMessage(message);
  toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     SHARED FIELD PROPS
  ========================================================= */

  const fieldProps = {
    form,
    onChange: handleChange,
    disabled: loading,
  };

  /* =========================================================
     REGISTRATION STEPS
  ========================================================= */

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <StepHeading
              title="Create Your Account"
              subtitle="Enter your basic details to create your account and get started."
              icon={UserRound}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  {...fieldProps}
                  label="Full Name"
                  name="name"
                  icon={UserRound}
                  placeholder="e.g. Rahul Sharma"
                  required
                  error={fieldErrors.name}
                />
              </div>

            {/* EMAIL */}
              <div className="space-y-2">
                <div className="relative">
                  <Field
                    {...fieldProps}
                    label="Email address"
                    name="email"
                    icon={Mail}
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    maxLength={255}
                    required
                    error={fieldErrors.email}
                    className={
                      emailVerified
                        ? "border-green-500 focus:border-green-500 focus:ring-green-100"
                        : ""
                    }
                  />

                  {emailVerified ? (
                    <span className="absolute right-3 top-[38px] z-10 flex items-center gap-1 text-sm font-semibold text-green-600">
                      <CheckCircle2 size={16} />
                      Verified
                    </span>
                  ) : (
                    form.email?.trim() && (
                      <button
                        type="button"
                        onClick={handleVerifyEmail}
                        disabled={emailLoading}
                        className="absolute right-3 top-[38px] z-10 text-sm font-semibold text-red-600 underline underline-offset-2 hover:text-red-700 disabled:opacity-50"
                      >
                        {emailLoading
                          ? "Sending..."
                          : verificationSent
                            ? "Resend link"
                            : "Verify"}
                      </button>
                    )
                  )}
                </div>

                {verificationSent && !emailVerified && (
                  <p className="text-sm text-amber-600">
                    Verification link sent. Open your inbox and click the link to verify your email.
                  </p>
                )}
              </div>
              <Field
                {...fieldProps}
                label="Mobile Number"
                name="mobile"
                icon={Smartphone}
                type="text"
                placeholder="10-digit mobile number"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                required
                error={fieldErrors.mobile}
              />

              <Field
                {...fieldProps}
                label="Password"
                name="password"
                icon={LockKeyhole}
                type="password"
                placeholder="At least 8 characters"
                required
                error={fieldErrors.password}
              />

              <Field
                {...fieldProps}
                label="Confirm Password"
                name="password_confirmation"
                icon={ShieldCheck}
                type="password"
                placeholder="Re-enter password"
                required
                error={fieldErrors.password_confirmation}
              />
            </div>

            <Checkbox
              name="terms"
              checked={form.terms}
              onChange={handleChange}
              disabled={loading}
            >
              I agree to the Terms of Service and Privacy Policy.
            </Checkbox>

            {fieldErrors.terms && (
              <p className="mt-2 text-xs text-rose-600">
                {fieldErrors.terms}
              </p>
            )}
          </>
        );

      case 2:
        return (
          <>
            <StepHeading
              title="Tell Us About Your Business"
              subtitle="These details help configure your workspace and WhatsApp onboarding."
              icon={Building2}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  {...fieldProps}
                  label="Business / Brand Name"
                  name="company_name"
                  icon={Building2}
                  placeholder="e.g. ABC Retail Pvt. Ltd."
                  maxLength={150}
                  required
                  error={fieldErrors.company_name}
                />
              </div>

              <SelectField
                {...fieldProps}
                label="Business Type"
                name="business_type"
                options={BUSINESS_TYPES}
                required
                error={fieldErrors.business_type}
              />

              <SelectField
                {...fieldProps}
                label="Industry"
                name="industry"
                options={INDUSTRIES}
                required
                error={fieldErrors.industry}
              />

              <SelectField
                {...fieldProps}
                label="Country"
                name="country"
                options={COUNTRIES}
                required
              />

              <Field
                {...fieldProps}
                label="City"
                name="city"
                icon={MapPin}
                placeholder="e.g. New Delhi"
                required
                error={fieldErrors.city}
              />

              <Field
                {...fieldProps}
                label="Website (optional)"
                name="website"
                icon={Globe}
                type="url"
                placeholder="https://yourbusiness.com"
                error={fieldErrors.website}
              />

              <Field
                {...fieldProps}
                label="GSTIN (optional)"
                name="gstin"
                icon={FileText}
                placeholder="Enter GSTIN if available"
                maxLength={20}
              />
            </div>

            <InfoBox>
              <strong>Use genuine business details.</strong> Business name
              and address should match your proof if verification is requested.
            </InfoBox>
          </>
        );

      case 3:
        return (
          <>
            <StepHeading
              title="Do You Have a Meta Business Account?"
              subtitle="Choose the option that best describes your setup. You can connect WhatsApp during onboarding."
              icon={MessageCircle}
            />

            <div className="space-y-3">
              {META_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected =
                  form.meta_account_type === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      updateForm("meta_account_type", option.value)
                    }
                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        selected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon size={19} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-800">
                        {option.title}
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {option.description}
                      </span>
                    </span>

                    <span
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {selected && <Check size={12} />}
                    </span>
                  </button>
                );
              })}
            </div>

            <InfoBox>
              <strong>Secure account connection.</strong> Use your official Meta Account for flow onbording. Never enter/share your personal facebook password with anyone.
            </InfoBox>
          </>
        );

      case 4:
        return (
          <>
            <StepHeading
              title="Business Documents"
              subtitle="Upload documents if needed for business onboarding or verification. Requirements may vary."
              icon={FileText}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FileUpload
                label="Utility Bill"
                description="Electricity, water or another accepted bill showing business name/address."
                name="utility_bill"
                file={form.utility_bill}
                onChange={handleFileChange}
                disabled={loading}
              />

              <FileUpload
                label="GST / Business Document"
                description="GST certificate or another accepted business proof, if applicable."
                name="gst_document"
                file={form.gst_document}
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>

            <div className="mt-4">
              <Field
                {...fieldProps}
                label="Additional Information (optional)"
                name="document_note"
                placeholder="Any note for the verification team"
                maxLength={1000}
              />
            </div>

            <Checkbox
              name="document_consent"
              checked={form.document_consent}
              onChange={handleChange}
              disabled={loading}
            >
              I confirm I am authorized to share these documents for business
              onboarding and verification.
            </Checkbox>

            {fieldErrors.document_consent && (
              <p className="mt-2 text-xs text-rose-600">
                {fieldErrors.document_consent}
              </p>
            )}

            <InfoBox>
              <strong>Privacy note.</strong> Uploaded documents should be
              stored in private storage with file validation, access controls
              and a retention policy.
            </InfoBox>
          </>
        );

      case 5:
        return (
          <>
            <StepHeading
              title="Choose your message-credit plan"
              subtitle="Choose a starting package. Final pricing and provider charges should be confirmed before checkout."
              icon={CreditCard}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLANS.map((plan) => {
                const selected =
                  String(form.plan_id) === String(plan.id);

                return (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={loading}
                    onClick={() => updateForm("plan_id", plan.id)}
                    className={`relative rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/10"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {plan.name}
                      </span>

                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          selected
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {selected && <Check size={12} />}
                      </span>
                    </span>

                    {plan.tag && (
                      <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold tracking-wide text-emerald-800">
                        {plan.tag}
                      </span>
                    )}

                    <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
                      {Number(plan.credits).toLocaleString("en-IN")}
                      <span className="ml-1 text-xs font-medium text-slate-500">
                        credits
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {plan.priceLabel}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {plan.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-slate-500">
                  Selected package
                </span>

                <strong className="text-right text-sm text-slate-800">
                  {selectedPlan.name} —{" "}
                  {Number(selectedPlan.credits).toLocaleString("en-IN")} credits
                </strong>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 py-2">
                <span className="text-sm text-slate-500">
                  Platform fee at signup
                </span>

                <strong className="text-sm text-slate-800">
                  {selectedPlan.price === "0"
                    ? "₹0"
                    : selectedPlan.priceLabel}
                </strong>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 py-2">
                <span className="text-sm text-slate-500">
                  WhatsApp/provider charges
                </span>

                <strong className="text-right text-xs text-slate-700">
                  May apply separately
                </strong>
              </div>
            </div>

            <InfoBox>
              <strong>Understand your credits.</strong> Confirm what one
              credit represents, along with expiry, recharge rules, taxes and
              any separate WhatsApp/provider charges.
            </InfoBox>

            <Checkbox
              name="billing_consent"
              checked={form.billing_consent}
              onChange={handleChange}
              disabled={loading}
            >
              I understand the selected package and agree to review pricing,
              credit usage and service terms before any paid purchase.
            </Checkbox>

            {fieldErrors.billing_consent && (
              <p className="mt-2 text-xs text-rose-600">
                {fieldErrors.billing_consent}
              </p>
            )}
          </>
        );

      default:
        return null;
    }
  };

  /* =========================================================
     SUCCESS SCREEN
  ========================================================= */

  const renderSuccess = () => {
    const details = [
      ["Full Name", form.name],
      ["Email Address", form.email],
      ["Mobile Number", form.mobile],
      ["Business Name", form.company_name],
      ["Business Type", form.business_type],
      ["Industry", form.industry],
      ["Country", form.country],
      ["City", form.city],
      ["Website", form.website || "Not provided"],
      ["GSTIN", form.gstin || "Not provided"],
      [
        "Meta Business Account",
        META_OPTIONS.find(
          (option) => option.value === form.meta_account_type
        )?.title || form.meta_account_type || "Not selected",
      ],
      ["Selected Plan", selectedPlan.name],
      [
        "Message Credits",
        Number(selectedPlan.credits).toLocaleString("en-IN"),
      ],
      ["Plan Price", selectedPlan.priceLabel],
      ["Utility Bill", form.utility_bill?.name || "Not uploaded"],
      [
        "GST / Business Document",
        form.gst_document?.name || "Not uploaded",
      ],
    ];

    return (
   <div className="relative overflow-hidden bg-white px-5 py-8 sm:px-10 sm:py-10">
  <div className="relative mx-auto max-w-3xl">

    {/* Animated Success Icon */}
    <div className="success-enter text-center">
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">

        {/* Animated pulse rings */}
        <div className="success-ring absolute inset-0 rounded-full border border-emerald-300" />

        <div className="success-ring success-ring-delay absolute inset-1 rounded-full border border-emerald-200" />

        {/* Green success circle */}
        <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/25">
          <svg
            viewBox="0 0 52 52"
            className="h-12 w-12"
            fill="none"
            aria-label="Registration successful"
            role="img"
          >
            <circle
              cx="26"
              cy="26"
              r="24"
              stroke="white"
              strokeOpacity="0.25"
              strokeWidth="1.5"
            />

            <path
              className="success-check"
              d="M15 27L22 34L37 18"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Small animated sparkles */}
        <span className="success-sparkle absolute right-0 top-3 h-2.5 w-2.5 rounded-full bg-amber-400" />

        <span className="success-sparkle success-sparkle-delay absolute bottom-3 left-0 h-2 w-2 rounded-full bg-indigo-400" />
      </div>

      {/* Success heading */}
      <div className="mt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            Registration completed
          </span>
        </div>

        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          You're all set!
        </h2>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
          Your registration details have been submitted successfully.
          Here's a summary of your account information.
        </p>
      </div>
    </div>

    {/* Registration Details Card */}
    <div className="success-card-enter mt-9 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_-20px_rgba(15,23,42,0.20)]">

      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Registration summary
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              Your submitted information
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Submitted
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2">
        {details.map(([label, value], index) => (
          <div
            key={label}
            style={{ animationDelay: `${index * 70}ms` }}
            className="detail-item min-w-0 bg-white px-5 py-4 transition-colors duration-200 hover:bg-slate-50 sm:px-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {label}
            </p>

            <p className="mt-1.5 break-words text-sm font-semibold text-slate-800">
              {value || "Not provided"}
            </p>
          </div>
        ))}
      </div>

      {/* Security Note */}
      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 sm:px-6">
        <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" />

        <p className="text-xs text-slate-500">
          Your password is protected and is never displayed here.
        </p>
      </div>
    </div>

    {/* WhatsApp Onboarding Card */}
    <div className="success-card-enter relative mt-5 overflow-hidden rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6">

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* WhatsApp Icon */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50">
          <MessageCircle className="h-7 w-7 text-indigo-600" />
        </div>

        {/* Onboarding Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Next up: Connect WhatsApp
            </h3>

            <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Action required
            </span>
          </div>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Connect your WhatsApp Business account to configure messaging,
            publish your automation journeys, and prepare your workspace.
          </p>
        </div>

        {/* Next Step Indicator */}
        <div className="shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>

            Continue onboarding
          </div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <p className="mt-6 text-center text-xs leading-5 text-slate-400">
      Thank you for choosing our platform.
      <span className="mx-1.5">·</span>
      your account information is handled securely.
    </p>

  </div>

  {/* Animation CSS */}
  <style>{`
    @keyframes success-enter {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.98);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes success-check-draw {
      from {
        stroke-dashoffset: 35;
      }

      to {
        stroke-dashoffset: 0;
      }
    }

    @keyframes success-ring-pulse {
      0% {
        opacity: 0.8;
        transform: scale(0.82);
      }

      100% {
        opacity: 0;
        transform: scale(1.35);
      }
    }

    @keyframes success-sparkle {
      0%, 100% {
        opacity: 0.4;
        transform: scale(0.7) translateY(0);
      }

      50% {
        opacity: 1;
        transform: scale(1.15) translateY(-3px);
      }
    }

    .success-enter {
      animation: success-enter 650ms cubic-bezier(.2,.8,.2,1) both;
    }

    .success-card-enter {
      animation: success-enter 650ms cubic-bezier(.2,.8,.2,1) 120ms both;
    }

    .success-check {
      stroke-dasharray: 35;
      stroke-dashoffset: 35;
      animation: success-check-draw 550ms ease-out 350ms forwards;
    }

    .success-ring {
      animation: success-ring-pulse 1.3s ease-out 150ms both;
    }

    .success-ring-delay {
      animation-delay: 350ms;
    }

    .success-sparkle {
      animation: success-sparkle 1.8s ease-in-out 500ms infinite;
    }

    .success-sparkle-delay {
      animation-delay: 900ms;
    }

    .detail-item {
      animation: success-enter 450ms ease-out both;
    }

    @media (prefers-reduced-motion: reduce) {
      .success-enter,
      .success-card-enter,
      .success-check,
      .success-ring,
      .success-ring-delay,
      .success-sparkle,
      .success-sparkle-delay,
      .detail-item {
        animation: none !important;
      }

      .success-check {
        stroke-dashoffset: 0;
      }
    }
  `}</style>
</div>
    );
  };

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-800">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />

      {!registrationComplete && (
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-emerald-800">
            <MessageCircle size={14} />
            YOUR AUTOMATION STARTS HERE
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Set up Your WhatsApp Business
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Create your account, Connect your business and choose a
            message-credit plan. Complete the steps to get started.
          </p>
        </div>
      )}

      <div
        className={`mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-10 sm:px-6 lg:px-8 ${
          registrationComplete
            ? "max-w-4xl pt-10"
            : "lg:grid-cols-[270px_minmax(0,1fr)]"
        }`}
      >
        {!registrationComplete && (
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-28 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
                <img
                  src={LOGO}
                  alt="WABA Tech Logo"
                  className="h-full w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>

            <p className="mb-4 text-[10px] font-bold tracking-[0.15em] text-slate-400">
              REGISTRATION STEPS
            </p>

            <div className="space-y-2">
              {STEPS.map((item, index) => {
                const number = index + 1;
                const active = step === number;
                const completed = step > number;

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => {
                      if (number < step && !loading) {
                        setStep(number);
                        setErrorMessage("");
                      }
                    }}
                    disabled={loading || number > step}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-emerald-200 bg-emerald-50"
                        : completed
                          ? "border-slate-100 bg-slate-50"
                          : "border-transparent bg-white"
                    } ${number < step ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        active
                          ? "bg-emerald-600 text-white"
                          : completed
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {completed ? <Check size={17} /> : number}
                    </span>

                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-bold ${
                          active ? "text-emerald-800" : "text-slate-700"
                        }`}
                      >
                        {item.title}
                      </span>

                      <span className="mt-0.5 block text-xs text-slate-400">
                        {item.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Headset size={15} />
              Need help with onboarding?
            </div>
          </aside>
        )}

        <main className="min-w-0">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04] sm:rounded-3xl">
            {registrationComplete ? (
              renderSuccess()
            ) : (
              <>
                <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold tracking-wide text-emerald-700">
                        STEP {step} OF 5
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {STEPS[step - 1]?.title}
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-slate-500">
                      {step * 20}% completed
                    </span>
                  </div>

                  <div
                    className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={step * 20}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${step * 20}%` }}
                    />
                  </div>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();

                    if (step < 5) {
                      handleNext();
                    } else {
                      handleSubmit(event);
                    }
                  }}
                  className="px-5 py-6 sm:px-7 sm:py-7"
                  noValidate
                >
                  {renderStep()}

                  {errorMessage && (
                    <div
                      role="alert"
                      className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                    >
                      {errorMessage}
                    </div>
                  )}

                  <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={step === 1 || loading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft size={17} />
                      Back
                    </button>

                    {step < 5 ? (
                      <button
                        type="submit"
                        disabled={loading}
                        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/15 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Continue
                        <ArrowRight
                          size={17}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            Create Account
                            <CheckCircle2 size={17} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </section>
        </main>
      </div>

      
    </div>
  );
};


export default Register;