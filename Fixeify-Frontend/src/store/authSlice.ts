import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios";

export enum UserRole {
  USER = "user",
  PRO = "pro",
  ADMIN = "admin",
}

export interface User { // Added export
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBanned?: boolean;
  phoneNo?: string | null;
  address?: string | null;
  photo?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  status: "idle",
  error: null,
};

export const refreshToken = createAsyncThunk(
  "auth/refreshToken",
  async (_, { rejectWithValue }) => {
    try {
      const refreshResponse = await api.post("/auth/refresh-token", {}, { withCredentials: true });
      const accessToken = refreshResponse.data.accessToken;
      if (!accessToken) {
        console.error("No accessToken in refresh response:", refreshResponse.data);
        throw new Error("No access token returned");
      }
      const userResponse = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
      });

      const user = userResponse.data;
      if (user.isBanned) {
        return rejectWithValue("User is banned");
      }

      return { accessToken, user };
    } catch (err: any) {
      console.error("Refresh error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config?.url,
      });
      return rejectWithValue(err.response?.data?.message || "Session expired");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (role: "user" | "admin", { rejectWithValue }) => {
    try {
      await api.post("/auth/logout", { role }, { withCredentials: true });
      return role;
    } catch (err: any) {
      console.error(`${role} logout error:`, err.response?.data);
      return rejectWithValue(err.response?.data?.message || "Logout failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.status = "succeeded";
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("isAuthenticatedManuallySet", "true");
    },
    logoutUserSync: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.status = "idle";
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("isAuthenticatedManuallySet");
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.status = "failed";
    },
    clearError: (state) => {
      state.error = null;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshToken.pending, (state) => {
        state.status = "loading";
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.status = "succeeded";
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("isAuthenticatedManuallySet", "true");
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.status = "failed";
        state.error = action.payload as string;
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("isAuthenticatedManuallySet");
      })
      .addCase(logoutUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.status = "idle";
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("isAuthenticatedManuallySet");
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.status = "idle";
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("isAuthenticatedManuallySet");
        state.error = action.payload as string;
      });
  },
});

export const { setAuth, logoutUserSync, setError, clearError, setAccessToken } = authSlice.actions;
export default authSlice.reducer;