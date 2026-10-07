import {
  ToastContainer,
  toast,
} from "react-toastify";

import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import axios from "axios";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000/api";

const Login = () => {

  const navigate = useNavigate();

  /* =======================================================
     AUTH
  ======================================================= */

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);


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
      | TOKEN
      |--------------------------------------------------------------------------
      */

      const newToken =
        response.data?.token ||
        response.data?.access_token ||
        response.data?.data?.token;


      if (!newToken) {

        toast.error(
          "Login token not received."
        );

        return;
      }


      localStorage.setItem(
        "token",
        newToken
      );

      setToken(newToken);


      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${newToken}`;


      toast.success(
        response.data?.message ||
        "Login successful."
      );


      setTimeout(() => {

        navigate("/workflow-builder");

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


      toast.error(message);


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


  return (
    <>

      {/* ===================================================
          TOAST
      =================================================== */}

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
      =================================================== */}

      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">

        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-8 text-center">

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/20">

              WF

            </div>


            <h1 className="text-2xl font-bold text-slate-900">

              Workflow Builder

            </h1>


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


              <input
                type="password"
                value={login.password}
                onChange={(e) =>
                  setLogin({
                    ...login,
                    password: e.target.value,
                  })
                }
                placeholder="Enter password"
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