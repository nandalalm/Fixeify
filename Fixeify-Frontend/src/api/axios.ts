import axios from "axios";
import { store } from "../store/store";
import { refreshToken, setAccessToken } from "../store/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false as boolean;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  const subscribers = [...refreshSubscribers];
  refreshSubscribers = [];
  subscribers.forEach((cb) => cb(token));
};

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  const hasAuthHeader = Boolean((config.headers as any)?.Authorization);
  if (token && config.url !== "/auth/refresh-token" && !hasAuthHeader) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    } as any;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};

    const status: number | undefined = error.response?.status;
    const message: string | undefined = error.response?.data?.message || error.response?.data?.error;
    const isRefreshEndpoint = originalRequest.url === "/auth/refresh-token";
    const alreadyRetried = (originalRequest as any)._retry;
    const looksLikeExpiredToken = message?.toLowerCase()?.includes("expired") || message?.toLowerCase()?.includes("invalid token");

    const currentToken: string | undefined = store.getState().auth.accessToken as any;
    const hadAuthHeader = Boolean((originalRequest.headers || {}).Authorization);
    const isAuthRoute = typeof originalRequest.url === 'string' && originalRequest.url.startsWith('/auth/');
    const isAccessTokenIssue = (status === 401 || status === 403) && !isRefreshEndpoint && !alreadyRetried && (hadAuthHeader || !!currentToken) && !isAuthRoute;

    if (isAccessTokenIssue && (status === 401 || looksLikeExpiredToken || status === 403)) {
      (originalRequest as any)._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            try {
              originalRequest.headers = {
                ...(originalRequest.headers || {}),
                Authorization: `Bearer ${token}`,
              };
              resolve(api(originalRequest));
            } catch (e) {
              reject(e);
            }
          });
        });
      }

      isRefreshing = true;
      try {
        const result = await store.dispatch(refreshToken()).unwrap();
        const { accessToken } = result;
        store.dispatch(setAccessToken(accessToken));
        onRefreshed(accessToken);
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        };
        return api(originalRequest);
      } catch (err) {
        console.error("Token refresh failed:", err);
        onRefreshed(""); 
        store.dispatch({ type: "auth/logoutUserSync" });
        window.location.href = "/";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;