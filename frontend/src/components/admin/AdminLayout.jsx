import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import axios from "axios";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const AdminLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Background sync user & permissions from /api/me
  useEffect(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${API}/me`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        if (res.data?.user) {
          const isLocal = Boolean(localStorage.getItem("token"));
          if (isLocal) {
            localStorage.setItem("user", JSON.stringify(res.data.user));
          } else {
            sessionStorage.setItem("user", JSON.stringify(res.data.user));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Route change hone par mobile sidebar close karein
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Sidebar open hone par background scrolling rok dein
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#f5f9f7]">
      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          h-screen w-64 bg-white
          transform transition-transform duration-300 ease-in-out
          ${
            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
          lg:translate-x-0
        `}
      >
        {/* MOBILE CLOSE BUTTON */}
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
        >
          <X size={20} />
        </button>

        <AdminSidebar />
      </aside>

      {/* MAIN AREA */}
      <div className="min-h-screen min-w-0 lg:ml-64">

        {/* STICKY HEADER */}
        <div className="sticky top-0 z-30">
          <AdminHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        </div>

        {/* PAGE CONTENT */}
        <main className="min-w-0 p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default AdminLayout;