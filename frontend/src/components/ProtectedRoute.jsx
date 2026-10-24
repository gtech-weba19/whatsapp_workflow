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

  // Token nahi hai to login page par bhejo
  if (!token) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;