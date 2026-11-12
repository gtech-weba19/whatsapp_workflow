
import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, SearchX } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-5">
      <div className="w-full max-w-lg text-center">

        <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-3xl bg-green-700/10 text-green-700">
          <SearchX size={48} className="text-green-600" />
        </div>

        <h1 className="text-8xl font-extrabold tracking-tight text-green-700">
          404
        </h1>

        <h2 className="mt-5 text-2xl font-bold text-slate-800">
          Page Not Found
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Sorry, the page you are looking for doesn't exist,
          has been moved, or the URL is incorrect.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft size={17} />
            Go Back
          </button>

          <button
            onClick={() => navigate("/")}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-green-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <Home size={17} />
            Back to Home
          </button>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          © {new Date().getFullYear()} WABA.TODAY. All rights reserved.
        </p>

      </div>
    </div>
  );
};

export default NotFound;
