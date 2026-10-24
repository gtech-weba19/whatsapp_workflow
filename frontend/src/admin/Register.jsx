import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  LockKeyhole,
  Check,
  Upload,
  BookOpen,
  ExternalLink,
  LogIn,
  LoaderCircle
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
  { title: "Get Started", subtitle: "Guidance & Support" },
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

  meta_account_type: "",

  onboarding_preference: "",
  number_setup_type: "",

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
  inputClassName = "",
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
          } ${inputClassName}`}
        />
      )}
    </div>

    {error && (
      <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
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
      <option value="">{placeholder || `Select ${label}`}</option>

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

      <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
    </div>
  </div>
);

const Checkbox = ({
  name,
  checked,
  onChange,
  children,
  disabled,
}) => (
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


/* =========================================================
   REGISTER PAGE
========================================================= */

const Register = () => {
  const navigate = useNavigate();

  // Restore saved step but keep it within the current 4-step flow.
  const [step, setStep] = useState(() => {
    const savedStep = Number(localStorage.getItem("register_step")) || 1;
    return Math.min(4, Math.max(1, savedStep));
  });

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem("register_form_data");

      return saved
        ? { ...initialForm, ...JSON.parse(saved) }
        : { ...initialForm };
    } catch {
      return { ...initialForm };
    }
  });

  const [loading, setLoading] = useState(false);
  const [savedSteps, setSavedSteps] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem("register_saved_steps") || "{}"
    );
  } catch {
    return {};
  }
});

  const [errorMessage, setErrorMessage] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});


  
const saveRegistrationProgress = async (
  completedStep,
  registrationCompleted = false
) => {
  const {
    password,
    password_confirmation,
    utility_bill,
    gst_document,
    ...safeForm
  } = form;

  const response = await axios.post(
    `${API}/registration-progress`,
    {
      step: completedStep,
      form: {
        ...safeForm,
        email: (safeForm.email || "").trim().toLowerCase(),
      },
      registration_completed: registrationCompleted,
    },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return response.data;
};



  // Persist form fields without passwords or file objects.
  useEffect(() => {
    const {
      password,
      password_confirmation,
      utility_bill,
      gst_document,
      ...safeForm
    } = form;

    localStorage.setItem(
      "register_form_data",
      JSON.stringify(safeForm)
    );

    localStorage.setItem("register_step", String(step));
  }, [form, step]);

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

  // City detection.
  useEffect(() => {
    let cancelled = false;

    const fetchCityFromIP = async () => {
      if (form.city?.trim()) return;

      setCityLoading(true);

      try {
        const response = await fetch("https://ipapi.co/json/");

        if (!response.ok) {
          throw new Error("Unable to fetch city");
        }

        const data = await response.json();

        if (!cancelled && data.city) {
          updateForm("city", data.city);
        }
      } catch (error) {
        console.error("City detection failed:", error);
      } finally {
        if (!cancelled) {
          setCityLoading(false);
        }
      }
    };

    fetchCityFromIP();

    return () => {
      cancelled = true;
    };
   
  }, []);



 const checkEmailAvailability = async (email) => {
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    setFieldErrors((previous) => ({
      ...previous,
      email: "Business email is required.",
    }));

    return false;
  }

  try {
    const response = await axios.post(
      `${API}/check-email`,
      { email: normalizedEmail },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    if (response.data?.available !== true) {
      setFieldErrors((previous) => ({
        ...previous,
        email: response.data?.message || "Email already taken.",
      }));

      return false;
    }

    setFieldErrors((previous) => ({
      ...previous,
      email: "",
    }));

    return true;
  } catch (error) {
    console.error("Email check API failed:", {
      url: `${API}/check-email`,
      message: error.message,
      status: error.response?.status,
      response: error.response?.data,
    });

    let message = "Unable to check email. Please try again.";

    if (!error.response) {
      message =
        "Backend URL Error";
    } else if (error.response.status === 422) {
      message =
        error.response.data?.errors?.email?.[0] ||
        "Please enter a valid email address.";
    } else if (error.response.status === 404) {
      message = "Email check API route not found.";
    } else if (error.response.status >= 500) {
      message = "Laravel server error. Check storage/logs/laravel.log.";
    }

    setFieldErrors((previous) => ({
      ...previous,
      email: message,
    }));

    return false;
  }
};

  /* =========================================================
     INPUT HANDLER
  ========================================================= */

  const handleChange = (event) => {
    const { name, value, type, checked, files } = event.target;

    if (type === "file") {
      const file = files?.[0] || null;

      if (file && file.size > 5 * 1024 * 1024) {
        toast.error("File size must not exceed 5 MB.");
        event.target.value = "";
        return;
      }

      updateForm(name, file);
      return;
    }

    if (name === "mobile") {
      updateForm(name, value.replace(/\D/g, "").slice(0, 10));
      return;
    }

    if (name === "email") {
      // Remove spaces only. Duplicate email validation runs on Continue.
      updateForm(name, value.replace(/\s/g, ""));
      return;
    }

    updateForm(name, type === "checkbox" ? checked : value);
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
        errors.mobile =
          "Enter a valid 10-digit Indian mobile number.";
      }

    if (!form.password) {
        errors.password = "Password is required.";
      } else if (form.password.length < 8) {
        errors.password = "Password must contain at least 8 characters.";
      } else if (form.password.length > 128) {
        errors.password = "Password must not exceed 128 characters.";
      } else if (!/[A-Z]/.test(form.password)) {
        errors.password =
          "Password must contain at least one uppercase letter (A-Z).";
      } else if (!/[a-z]/.test(form.password)) {
        errors.password =
          "Password must contain at least one lowercase letter (a-z).";
      } else if (!/[0-9]/.test(form.password)) {
        errors.password =
          "Password must contain at least one number (0-9).";
      } else if (!/[^A-Za-z0-9]/.test(form.password)) {
        errors.password =
          "Password must contain at least one special character (e.g. @, #, $).";
      }

      if (!form.password_confirmation) {
        errors.password_confirmation = "Please confirm your password.";
      } else if (form.password !== form.password_confirmation) {
        errors.password_confirmation = "Passwords do not match.";
      }

      if (!form.password_confirmation) {
        errors.password_confirmation =
          "Please confirm your password.";
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
  const websiteValue = form.website.trim();

  try {
    const website = new URL(websiteValue);

    const validProtocol = ["http:", "https:"].includes(
      website.protocol
    );

    const validHostname =
      website.hostname.length <= 253 &&
      website.hostname.includes(".") &&
      website.hostname
        .split(".")
        .every(
          (label) =>
            label.length >= 1 &&
            label.length <= 63 &&
            /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(
              label
            )
        );

    const validTld = /\.[a-zA-Z]{2,}$/.test(website.hostname);

    const validCredentials =
      !website.username && !website.password;

    if (
      !validProtocol ||
      !validHostname ||
      !validTld ||
      !validCredentials
    ) {
      errors.website =
        "Please enter a valid website URL, e.g. https://example.com.";
    }
  } catch {
    errors.website =
      "Enter a valid website URL, including https:// or http://.";
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
     NEXT / BACK - 4 STEPS
  ========================================================= */


// const handleNext = async () => {
//   if (loading) return;

//   // 1. Validate current step
//   const validationError = validateStep(step);

//   if (validationError) {
//     if (validationError !== "FIELD_ERRORS") {
//       toast.error(validationError);
//     }
//     return;
//   }

//   setLoading(true);

//   try {
//     // 2. Check email availability on EVERY step
//     const emailAvailable = await checkEmailAvailability(form.email);

//     if (!emailAvailable) {
//       setStep(1);

//       window.scrollTo({
//         top: 0,
//         behavior: "smooth",
//       });

//       return;
//     }

//     // 3. Validate Meta account selection
//     if (step === 3 && !form.meta_account_type) {
//       setFieldErrors((previous) => ({
//         ...previous,
//         meta_account_type: "Please select an option to continue.",
//       }));

//       toast.error("Please select an option to continue.");
//       return;
//     }

//     const stepKey = String(step);
//     const alreadySaved = savedSteps[stepKey] === true;

//     // 4. Save progress only if this step hasn't been saved before
//     if (!alreadySaved) {
//       const result = await saveRegistrationProgress(step);

//       if (!result?.progress_saved) {
//         throw new Error(
//           result?.message || "Could not save registration progress."
//         );
//       }

//       const updatedSteps = {
//         ...savedSteps,
//         [stepKey]: true,
//       };

//       setSavedSteps(updatedSteps);

//       localStorage.setItem(
//         "register_saved_steps",
//         JSON.stringify(updatedSteps)
//       );

//     }

//     // 5. Clear Step 3 validation error
//     if (step === 3) {
//       setFieldErrors((previous) => ({
//         ...previous,
//         meta_account_type: "",
//       }));
//     }

//     // 6. Go to next step
//     setStep((previous) => Math.min(previous + 1, 4));

//     window.scrollTo({
//       top: 0,
//       behavior: "smooth",
//     });
//   } catch (error) {
//     console.error(
//       "Registration progress error:",
//       error.response?.data || error.message
//     );

//     toast.error(
//       error.response?.data?.message ||
//         "Could not save this step. Please try again."
//     );
//   } finally {
//     setLoading(false);
//   }
// };


const handleNext = async () => {
  if (loading) return;

  // Final step par registration submit karein
  if (step === 4) {
    await handleSubmit();
    return;
  }

  const validationError = validateStep(step);

  if (validationError) {
    if (validationError !== "FIELD_ERRORS") {
      toast.error(validationError);
    }
    return;
  }

  setLoading(true);

  try {
    // Email availability sirf Step 1 par check hogi
    if (step === 1) {
      const emailAvailable = await checkEmailAvailability(form.email);

      if (!emailAvailable) {
        setStep(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    const stepKey = String(step);

    if (savedSteps[stepKey] !== true) {
      const result = await saveRegistrationProgress(step);

      if (!result?.progress_saved) {
        throw new Error(
          result?.message || "Could not save registration progress."
        );
      }

      const updatedSteps = {
        ...savedSteps,
        [stepKey]: true,
      };

      setSavedSteps(updatedSteps);
      localStorage.setItem(
        "register_saved_steps",
        JSON.stringify(updatedSteps)
      );
    }

    setStep((previous) => Math.min(previous + 1, 4));

    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    toast.error(
      error.response?.data?.message ||
        error.message ||
        "Could not save this step. Please try again."
    );
  } finally {
    setLoading(false);
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

  // Validate all four registration steps.
  for (let currentStep = 1; currentStep <= 4; currentStep += 1) {
    const validationError = validateStep(currentStep);

    if (validationError) {
      setStep(currentStep);

      if (validationError !== "FIELD_ERRORS") {
        setErrorMessage(validationError);
        toast.warning(validationError, {
          toastId: "registration-validation",
        });
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }
  }

  // Check email availability.
  const emailAvailable = await checkEmailAvailability(form.email);

  if (!emailAvailable) {
    setStep(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    return;
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

    // STEP 3: META BUSINESS ACCOUNT
    payload.append("meta_account_type", form.meta_account_type);

    // STEP 4: WHATSAPP ONBOARDING PREFERENCE
    payload.append(
      "onboarding_preference",
      form.onboarding_preference || ""
    );
    payload.append(
      "number_setup_type",
      form.number_setup_type || ""
    );

    // DOCUMENTS
    if (form.utility_bill) {
      payload.append("utility_bill", form.utility_bill);
    }

    if (form.gst_document) {
      payload.append("gst_document", form.gst_document);
    }

    payload.append(
      "document_note",
      (form.document_note || "").trim()
    );

    payload.append(
      "document_consent",
      form.document_consent ? "1" : "0"
    );

    // SUBMIT REGISTRATION
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

    const registrationSucceeded =
      Boolean(token) || data?.success === true;

    if (!registrationSucceeded) {
      throw new Error(
        data?.message || "Registration could not be completed."
      );
    }

    // Save final progress without showing a separate toast.
    try {
      const progressResult = await saveRegistrationProgress(4, true);

      if (!progressResult?.progress_saved) {
        console.warn(
          "Registration completed, but final progress was not saved."
        );
      }

      if (progressResult?.admin_email_sent === false) {
        console.warn(
          "Registration completed, but the Admin progress email was not sent."
        );
      }
    } catch (progressError) {
      console.error(
        "Final registration progress error:",
        progressError.response?.data || progressError.message
      );
    }

    // Clear saved registration information.
    localStorage.removeItem("register_form_data");
    localStorage.removeItem("register_step");
    localStorage.removeItem("register_email_verified");
    localStorage.removeItem("register_verified_email");

    sessionStorage.removeItem("registration_success_message");

    // Do not automatically log the user in.
    setRegistrationComplete(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Dismiss any previous notifications and show only one success toast.
    toast.dismiss();

    toast.success("Registration completed successfully!", {
      toastId: "registration-complete",
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error.response?.data || error.message
    );

    const responseData = error.response?.data;
    const errors = responseData?.errors || {};
    const formattedErrors = {};

    Object.entries(errors).forEach(([field, messages]) => {
      formattedErrors[field] = Array.isArray(messages)
        ? messages[0]
        : String(messages);
    });

    setFieldErrors((previous) => ({
      ...previous,
      ...formattedErrors,
    }));

    if (errors.email) {
      setStep(1);

      const emailError = Array.isArray(errors.email)
        ? errors.email[0]
        : errors.email;

      setErrorMessage("");

      toast.error(emailError, {
        toastId: "registration-email-error",
      });

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
      responseData?.message ||
      error.message ||
      "Unable to register. Please try again.";

    setErrorMessage(message);

    toast.error(message, {
      toastId: "registration-error",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

              <div>
                <Field
                  {...fieldProps}
                  label="Email Address"
                  name="email"
                  icon={Mail}
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  maxLength={255}
                  required
                  error={fieldErrors.email}
                />

                <p className="mt-1 text-xs text-slate-500">
                  Enter your business email. We will check whether it is
                  already registered.
                </p>
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
                autoComplete="new-password"
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
                autoComplete="new-password"
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
                error={fieldErrors.country}
              />

              <div>
                <Field
                  {...fieldProps}
                  label="City"
                  name="city"
                  icon={MapPin}
                  placeholder={
                    cityLoading ? "Detecting your city..." : "e.g. New Delhi"
                  }
                  required
                  error={fieldErrors.city}
                />

                <p className="mt-1 text-xs text-slate-500">
                  {cityLoading
                    ? "Detecting your location..."
                    : form.city
                      ? "City detected from your IP address. You can edit it if needed."
                      : "Enter your city manually if it could not be detected."}
                </p>
              </div>

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
                error={fieldErrors.gstin}
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
              <strong>Secure account connection.</strong> Use your official
              Meta account for flow onboarding. Never share your personal
              Facebook password with anyone.
            </InfoBox>
          </>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Connect Your WhatsApp
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Choose how you want to set up your WhatsApp number.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  updateForm("onboarding_preference", "guide");
                  updateForm("number_setup_type", "");
                }}
                className={`rounded-2xl border p-5 text-left transition ${
                  form.onboarding_preference === "guide"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <BookOpen size={22} />
                </div>

                <h3 className="font-semibold text-slate-900">Guide</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Follow the steps to migrate or connect your number.
                </p>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  updateForm("onboarding_preference", "support");
                  updateForm("number_setup_type", "");
                }}
                className={`rounded-2xl border p-5 text-left transition ${
                  form.onboarding_preference === "support"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <Headset size={22} />
                </div>

                <h3 className="font-semibold text-slate-900">Support</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Contact our team for assistance.
                </p>
              </button>
            </div>

            {form.onboarding_preference === "guide" && (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">
                  Choose Your Setup Option
                </h3>

                <div
                  className={`rounded-xl border p-4 transition ${
                    form.number_setup_type === "migrate"
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <ArrowRight size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-900">
                        Migrate Number
                      </h4>

                      <a
                        href="https://ajayaar.com/2026/10/15/how-to-migrate-an-existing-number-to-whatsapp-business-api-step-by-step-guide/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Read Guide
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-4 transition ${
                    form.number_setup_type === "connect"
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <Smartphone size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-900">
                        Connect New Number
                      </h4>

                      <a
                        href="https://ajayaar.com/2026/10/15/how-to-add-a-new-number-to-whatsapp-business-api-step-by-step-guide/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Read Guide
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {form.onboarding_preference === "support" && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
                <h3 className="font-semibold text-slate-900">
                  Contact Support
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  Get help with your WhatsApp number setup.
                </p>

                <div className="mt-5 space-y-3">
                  <a
                    href="tel:+919876543210"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <Smartphone
                      size={20}
                      className="shrink-0 text-blue-600"
                    />

                    <div>
                      <p className="text-xs text-slate-500">Call Support</p>
                      <p className="font-semibold text-slate-900">
                        +91 98765 43210
                      </p>
                    </div>

                    <ExternalLink
                      size={16}
                      className="ml-auto text-slate-400"
                    />
                  </a>

                  <a
                    href="mailto:support@yourdomain.com"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <Mail size={20} className="shrink-0 text-blue-600" />

                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        Email Support
                      </p>
                      <p className="break-all font-semibold text-slate-900">
                        support@yourdomain.com
                      </p>
                    </div>

                    <ExternalLink
                      size={16}
                      className="ml-auto shrink-0 text-slate-400"
                    />
                  </a>

                  <a
                    href="https://wa.me/919810120907?text=Hello%2C%20I%20need%20help%20with%20WhatsApp%20number%20setup."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <MessageCircle size={21} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">Live Chat</p>
                      <p className="font-semibold text-slate-900">
                        Chat with Support
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Chat with our team on WhatsApp
                      </p>
                    </div>

                    <ExternalLink
                      size={16}
                      className="shrink-0 text-slate-400"
                    />
                  </a>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  /* =========================================================
     SUCCESS SCREEN
  ========================================================= */

  const renderSuccess = () => (
    <div className="relative overflow-hidden px-5 py-10 sm:px-10 sm:py-12">
      <div className="relative mx-auto max-w-3xl">
        <div className="success-enter text-center">
          <div className="success-scene relative mx-auto flex h-32 w-32 items-center justify-center">
            <div className="success-glow absolute h-24 w-24 rounded-full bg-emerald-400/25 blur-2xl" />

            <div className="success-ring absolute inset-3 rounded-full border-2 border-emerald-300" />

            <div className="success-ring success-ring-delay absolute inset-3 rounded-full border-2 border-green-200" />

            <span className="success-orbit absolute left-2 top-7 h-2.5 w-2.5 rounded-full bg-amber-400" />

            <span className="success-orbit absolute right-2 top-9 h-2 w-2 rounded-full bg-emerald-400" />

            <div className="success-badge relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-xl shadow-emerald-600/30">
              <div className="absolute inset-1 rounded-full border border-white/30" />

              <svg
                viewBox="0 0 24 24"
                className="relative h-11 w-11"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="Registration successful"
                role="img"
              >
                <path d="M5 12.5 10 17l9-10" />
              </svg>
            </div>
          </div>

          <div className="success-heading mt-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                Registration Successful
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Welcome Aboard!
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
              Your account has been created successfully. Please log in
              to continue.
            </p>
          </div>
        </div>

        <div className="success-card-enter mt-8 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 sm:w-auto"
          >
            
            Please Login to Continue

            <LogIn 
              size={18}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </button>
        </div>

        <p className="success-card-enter mt-8 text-center text-xs leading-5 text-slate-400">
          Thank you for choosing our platform.
          <span className="mx-1.5">·</span>
          Your account information is handled securely.
        </p>
      </div>

      <style>{`
        @keyframes success-enter {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes success-badge-pop {
          0% {
            opacity: 0;
            transform: scale(0.35) rotate(-18deg);
          }
          65% {
            opacity: 1;
            transform: scale(1.12) rotate(4deg);
          }
          100% {
            transform: scale(1) rotate(0);
          }
        }

        @keyframes success-ring-pulse {
          0% {
            opacity: 0;
            transform: scale(0.55);
          }
          25% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: scale(1.55);
          }
        }

        @keyframes success-glow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.85);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.2);
          }
        }

        @keyframes success-orbit {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-7px) scale(1.15);
          }
        }

        @keyframes success-heading-enter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .success-enter {
          animation: success-enter 650ms cubic-bezier(.2,.8,.2,1) both;
        }

        .success-badge {
          animation: success-badge-pop 750ms cubic-bezier(.16,1,.3,1) 100ms both;
        }

        .success-ring {
          animation: success-ring-pulse 1.4s ease-out 200ms both;
        }

        .success-ring-delay {
          animation-delay: 500ms;
        }

        .success-glow {
          animation: success-glow 2.4s ease-in-out 300ms infinite;
        }

        .success-orbit {
          animation: success-orbit 2s ease-in-out infinite;
        }

        .success-heading {
          animation: success-heading-enter 650ms ease-out 250ms both;
        }

        .success-card-enter {
          animation: success-enter 650ms cubic-bezier(.2,.8,.2,1) 250ms both;
        }

        @media (prefers-reduced-motion: reduce) {
          .success-enter,
          .success-badge,
          .success-ring,
          .success-ring-delay,
          .success-glow,
          .success-orbit,
          .success-heading,
          .success-card-enter {
            animation: none !important;
            transition: none !important;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );

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
            Create your account, connect your business and configure your
            WhatsApp onboarding. Complete the steps to get started.
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
                        STEP {step} OF 4
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {STEPS[step - 1]?.title}
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-slate-500">
                      {step * 25}% completed
                    </span>
                  </div>

                  <div
                    className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={step * 25}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${step * 25}%` }}
                    />
                  </div>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();

                    if (step < 4) {
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
                      className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft size={17} />
                      Back
                    </button>

                    {step < 4 ? (
               <button
                    type="submit"
                    disabled={loading}
                    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/15 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight
                          size={17}
                          className="transition-transform group-hover:translate-x-1 cursor-pointer"
                        />
                      </>
                    )}
                  </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="cursor-pointer group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            Complete Registration
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