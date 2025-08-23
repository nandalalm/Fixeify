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
  console.log("Request interceptor: Current token:", token);
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
    console.log("Response interceptor: Successful response", response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    console.log("Response interceptor: Error caught", {
      status: error.response?.status,
      data: error.response?.data,
      url: originalRequest.url,
    });

    const status: number | undefined = error.response?.status;
    const message: string | undefined = error.response?.data?.message || error.response?.data?.error;
    const isRefreshEndpoint = originalRequest.url === "/auth/refresh-token";
    const alreadyRetried = (originalRequest as any)._retry;
    const isAccessTokenIssue = (status === 401 || status === 403) && !isRefreshEndpoint && !alreadyRetried;
    const looksLikeExpiredToken = message?.toLowerCase()?.includes("expired") || message?.toLowerCase()?.includes("invalid token");

    if (isAccessTokenIssue && (status === 401 || looksLikeExpiredToken || status === 403)) {
      (originalRequest as any)._retry = true;
      console.log(`${status} detected, attempting token refresh for:`, originalRequest.url);

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
        console.log("Token refresh successful, new token:", accessToken);
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