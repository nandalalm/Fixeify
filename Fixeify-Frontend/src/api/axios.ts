import axios from "axios";
import { store } from "../store/store";
import { setAccessToken } from "../store/authSlice";

const api = axios.create({ baseURL: "http://localhost:5000/api" });

api.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          "http://localhost:5000/api/auth/refresh",
          {},
          { withCredentials: true }
        );
        store.dispatch(setAccessToken(data.accessToken));
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("Token refresh failed", err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;