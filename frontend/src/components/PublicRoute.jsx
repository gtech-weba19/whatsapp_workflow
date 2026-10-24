import { Navigate, Outlet, useLocation } from "react-router-dom";

const PublicRoute = () => {
  const location = useLocation();

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("auth_token") ||
    sessionStorage.getItem("access_token");

  // Login/Register se Dashboard par redirect tabhi karein
  // jab user already authenticated ho aur normal navigation kare.
  const isPageRefresh =
    typeof performance !== "undefined" &&
    performance.getEntriesByType("navigation")[0]?.type === "reload";

  if (token && !isPageRefresh) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;