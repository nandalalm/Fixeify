import axios from "axios";
import { store } from "../store/store";
import { refreshToken, setAccessToken } from "../store/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  console.log("Request interceptor: Current token:", token);
  if (token && config.url !== "/auth/refresh-token") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log("Response interceptor: Successful response", response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.log("Response interceptor: Error caught", {
      status: error.response?.status,
      data: error.response?.data,
      url: originalRequest.url,
    });

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== "/auth/refresh-token") {
      originalRequest._retry = true;
      console.log("401 detected, attempting token refresh for:", originalRequest.url);
      try {
        const { accessToken } = await store.dispatch(refreshToken()).unwrap();
        console.log("Token refresh successful, new token:", accessToken);
        store.dispatch(setAccessToken(accessToken));
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("Token refresh failed:", err);
        store.dispatch({ type: "auth/logoutUserSync" });
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;