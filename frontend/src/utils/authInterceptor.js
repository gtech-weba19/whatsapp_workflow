import axios from "axios";

let isHandlingUnauthorized = false;

axios.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";

    // Login API ke 401 ko ignore karein
    const isLoginRequest = requestUrl.includes("/login");

    // Check authentication token
    const hasToken =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");

    // Session expired / unauthorized
    if (
      status === 401 &&
      hasToken &&
      !isLoginRequest &&
      window.location.pathname !== "/"
    ) {
      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true;

        // Clear authentication data
        [
          "token",
          "auth_token",
          "access_token",
          "user",
          "tenant",
        ].forEach((key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        // Remove default authorization header
        delete axios.defaults.headers.common.Authorization;

        // Save session expired message
        sessionStorage.setItem(
          "logoutMessage",
          "Your session has expired. Please log in again."
        );

        // Redirect to Login page
        window.location.replace("/");
      }
    }

    return Promise.reject(error);
  }
);