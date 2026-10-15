import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = () => {
  const location = useLocation();

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("auth_token") ||
    sessionStorage.getItem("access_token");

  // Login nahi hai to login page par bhejein.
  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  let user = null;

  try {
    user =
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  // User data nahi hai to login par bhejein.
  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Authenticated user ko protected route access dein.
  return <Outlet />;
};

export default ProtectedRoute;