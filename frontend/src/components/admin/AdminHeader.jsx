import {
  ChevronDown,
  Settings,
  LogOut,
  User,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AdminHeader = () => {

  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);

 const handleLogout = () => {

  // Remove authentication token
  localStorage.removeItem("token");

  // Remove axios authorization
  delete axios.defaults.headers.common["Authorization"];

  // Save logout message
  sessionStorage.setItem(
    "logoutMessage",
    "You have been logged out successfully."
  );

  // Close dropdown
  setProfileOpen(false);

  // Go to login page
  navigate("/", {
    replace: true,
  });

};

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">

      {/* =====================================================
          LEFT
      ====================================================== */}

      <div>

        <h2 className="text-lg font-semibold text-slate-900">
          Dashboard
        </h2>

      </div>


      {/* =====================================================
          RIGHT
      ====================================================== */}

      <div className="flex items-center gap-4">

        {/* =====================================================
            PROFILE DROPDOWN
        ====================================================== */}

        <div className="relative">

          <button
            type="button"
            onClick={() =>
              setProfileOpen((prev) => !prev)
            }
            className="
              flex
              items-center
              gap-3
              rounded-xl
              px-2
              py-1.5
              transition
              hover:bg-slate-50
            "
          >

            {/* AVATAR */}

            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-indigo-100
                text-sm
                font-bold
                text-indigo-700
              "
            >
              A
            </div>


            {/* USER INFO */}

            <div className="hidden text-left md:block">

              <p className="text-sm font-semibold text-slate-800">
                Administrator
              </p>

              <p className="text-[11px] text-slate-400">
                Super Admin
              </p>

            </div>


            {/* ARROW */}

            <ChevronDown
              size={15}
              className={`
                text-slate-400
                transition-transform
                ${
                  profileOpen
                    ? "rotate-180"
                    : ""
                }
              `}
            />

          </button>


          {/* =====================================================
              DROPDOWN
          ====================================================== */}

          {profileOpen && (

            <div
              className="
                absolute
                right-0
                top-full
                z-50
                mt-2
                w-60
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-xl
                shadow-slate-200/50
              "
            >

              {/* USER HEADER */}

              <div className="border-b border-slate-100 p-4">

                <div className="flex items-center gap-3">

                  <div
                    className="
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-full
                      bg-indigo-100
                      text-base
                      font-bold
                      text-indigo-700
                    "
                  >
                    A
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-bold text-slate-800">
                      Administrator
                    </p>

                    <p className="truncate text-xs text-slate-400">
                      Super Admin
                    </p>

                  </div>

                </div>

              </div>


              {/* MENU */}

              <div className="p-2">

                {/* PROFILE */}

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/profile");
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-sm
                    font-medium
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    hover:text-slate-900
                  "
                >

                  <User
                    size={17}
                    className="text-slate-400"
                  />

                  <span>
                    My Profile
                  </span>

                </button>


                {/* SETTINGS */}

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/settings");
                  }}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-sm
                    font-medium
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    hover:text-slate-900
                  "
                >

                  <Settings
                    size={17}
                    className="text-slate-400"
                  />

                  <span>
                    Settings
                  </span>

                </button>

              </div>


              {/* LOGOUT */}

              <div className="border-t border-slate-100 p-2">

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-sm
                    font-semibold
                    text-red-600
                    transition
                    hover:bg-red-50
                  "
                >

                  <LogOut size={17} />

                  <span>
                    Logout
                  </span>

                </button>

              </div>

            </div>

          )}

        </div>

      </div>

    </header>
  );
};

export default AdminHeader;