import {
  ToastContainer,
  toast,
} from "react-toastify";

import {
  Workflow,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  useState,
  useEffect,
} from "react";

import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import axios from "axios";


const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000/api";


const Login = () => {

  const navigate = useNavigate();

  const location = useLocation();


  /* =======================================================
     AUTH
  ======================================================= */

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });


  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);


  /* =======================================================
     PASSWORD VISIBILITY
  ======================================================= */

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


useEffect(() => {

  const logoutMessage =
    sessionStorage.getItem("logoutMessage");

  if (!logoutMessage) {
    return;
  }

  // Show notification
  toast.success(logoutMessage);

  // Remove after reading
  sessionStorage.removeItem("logoutMessage");

}, []);


  /* =======================================================
     LOGIN
  ======================================================= */

  const doLogin = async () => {

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      !login.email.trim() ||
      !login.password
    ) {

      toast.warning(
        "Please enter email and password."
      );

      return;
    }


    /*
    |--------------------------------------------------------------------------
    | START LOADING
    |--------------------------------------------------------------------------
    */

    setLoginLoading(true);


    try {

      /*
      |--------------------------------------------------------------------------
      | LOGIN API
      |--------------------------------------------------------------------------
      */

      const response = await axios.post(
        `${API}/login`,
        {
          email: login.email.trim(),
          password: login.password,
        }
      );


      /*
      |--------------------------------------------------------------------------
      | GET TOKEN
      |--------------------------------------------------------------------------
      */

      const newToken =
        response.data?.token ||
        response.data?.access_token ||
        response.data?.data?.token;


      /*
      |--------------------------------------------------------------------------
      | TOKEN NOT FOUND
      |--------------------------------------------------------------------------
      */

      if (!newToken) {

        toast.error(
          "Login token not received."
        );

        return;
      }


      /*
      |--------------------------------------------------------------------------
      | SAVE TOKEN
      |--------------------------------------------------------------------------
      */

      localStorage.setItem(
        "token",
        newToken
      );


      /*
      |--------------------------------------------------------------------------
      | SET AXIOS AUTHORIZATION
      |--------------------------------------------------------------------------
      */

      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${newToken}`;


      /*
      |--------------------------------------------------------------------------
      | LOGIN SUCCESS
      |--------------------------------------------------------------------------
      */

      toast.success(
        response.data?.message ||
        "Login successful."
      );


      /*
      |--------------------------------------------------------------------------
      | GO TO DASHBOARD
      |--------------------------------------------------------------------------
      */

      setTimeout(() => {

        navigate("/dashboard", {
          replace: true,
        });

      }, 500);


    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      /*
      |--------------------------------------------------------------------------
      | API ERROR MESSAGE
      |--------------------------------------------------------------------------
      */

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (
          error?.response?.data?.errors
            ? Object.values(
                error.response.data.errors
              )
                .flat()
                .join(" ")
            : null
        ) ||
        "Login failed.";


      toast.error(
        message
      );


    } finally {

      setLoginLoading(false);

    }

  };


  /* =======================================================
     ENTER KEY
  ======================================================= */

  const handlePasswordKeyDown = (e) => {

    if (
      e.key === "Enter" &&
      !loginLoading
    ) {

      doLogin();

    }

  };


  /* =======================================================
     UI
  ======================================================= */

  return (
    <>

      {/* ===================================================
          TOAST
      ==================================================== */}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />


      {/* ===================================================
          PAGE
      ==================================================== */}

      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">

        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-8 text-center">


            {/* =================================================
                LOGO
            ================================================= */}

            <img src="/gtech-logo.png" alt="Logo" className="mx-auto mb-4 h-24 w-24 rounded-2xl" />


            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <p className="mt-2 text-sm text-slate-500">

              Build powerful
              WhatsApp automation
              workflows.

            </p>

          </div>


          {/* =================================================
              FORM
          ================================================= */}

          <div className="space-y-5">


            {/* ===============================================
                EMAIL
            =============================================== */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">

                Email

              </label>


              <input
                type="email"
                value={login.email}
                onChange={(e) =>
                  setLogin({
                    ...login,
                    email: e.target.value,
                  })
                }
                placeholder="Enter email"
                autoComplete="email"
                disabled={loginLoading}
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-3
                  text-sm
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:bg-white
                  focus:ring-4
                  focus:ring-indigo-500/10
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              />

            </div>


            {/* ===============================================
                PASSWORD
            =============================================== */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">

                Password

              </label>


              <div className="relative">


                {/* =================================================
                    PASSWORD INPUT
                ================================================== */}

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={login.password}
                  onChange={(e) =>
                    setLogin({
                      ...login,
                      password: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loginLoading}
                  onKeyDown={
                    handlePasswordKeyDown
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    pr-12
                    text-sm
                    outline-none
                    transition
                    focus:border-indigo-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-indigo-500/10
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                />


                {/* =================================================
                    SHOW / HIDE PASSWORD BUTTON
                ================================================== */}

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  disabled={loginLoading}
                  className="
                    absolute
                    right-3
                    top-1/2
                    flex
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-lg
                    p-1.5
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-600
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  title={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >

                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}

                </button>

              </div>

            </div>


            {/* ===============================================
                LOGIN BUTTON
            =============================================== */}

            <button
              type="button"
              onClick={doLogin}
              disabled={loginLoading}
              className="
                w-full
                rounded-xl
                bg-indigo-600
                px-5
                py-3.5
                text-sm
                font-bold
                text-white
                shadow-lg
                shadow-indigo-500/20
                transition
                hover:bg-indigo-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >

              {loginLoading
                ? "Signing in..."
                : "Sign In"}

            </button>

          </div>

        </div>

      </div>

    </>
  );

};


export default Login;