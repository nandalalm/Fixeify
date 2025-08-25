import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios";
import { initializeSocket, disconnectSocket } from "../services/socket";
import { RootState } from "../store/store";

export enum UserRole {
  USER = "user",
  PRO = "pro",
  ADMIN = "admin",
}

export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; 
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBanned?: boolean;
  phoneNo?: string | null;
  address?: ILocation | null;
  photo?: string | null;
}

export interface BookingResponse {
  id: string;
  user: User;
  pro: any; 
  category: { id: string; name: string };
  location: ILocation;
  preferredDate: Date;
  preferredTime: { startTime: string; endTime: string }[];
  phoneNumber: string;
  issueDescription: string;
  status: string;
  rejectedReason?: string;
  paymentIntent?: any; 
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  paymentSuccessData: {
    bookingDetails: BookingResponse | null;
    proId: string | null;
    pro: any | null; 
    categoryId: string | null;
    location: ILocation | null;
    totalCost: number | null;
  } | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  status: "idle",
  error: null,
  paymentSuccessData: null,
};

export interface RefreshTokenResponse {
  accessToken: string;
  user: User;
}

export const refreshToken = createAsyncThunk<RefreshTokenResponse, void, { rejectValue: string }>(
  "auth/refreshToken",
  async (_, { rejectWithValue, dispatch }) => {
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

      dispatch(setAccessToken(accessToken));
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

export const checkBanStatus = createAsyncThunk<{ isBanned: boolean } | void, void, { rejectValue: string }>(
  "auth/checkBanStatus",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const user = state.auth.user;
      if (!user || user.role === "admin") return;

      const response = await api.get(`/auth/check-ban/${user.id}`, {
        headers: { Authorization: `Bearer ${state.auth.accessToken}` },
        withCredentials: true,
      });

      return { isBanned: !!response.data.isBanned };
    } catch (err: any) {
      console.error("Ban status check failed:", err);
      return rejectWithValue(err.response?.data?.message || "Failed to check ban status");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (role: "user" | "admin" | "pro", { rejectWithValue }) => {
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
      initializeSocket(action.payload.accessToken);
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logoutUserSync: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.status = "idle";
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("isAuthenticatedManuallySet");
      disconnectSocket();
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
    setPaymentSuccessData: (
      state,
      action: PayloadAction<{
        bookingDetails: BookingResponse;
        proId: string;
        pro: any;
        categoryId: string | null; 
        location: ILocation;
        totalCost: number;
      }>
    ) => {
      state.paymentSuccessData = {
        ...action.payload,
        categoryId: action.payload.categoryId || null, 
      };
    },
    clearPaymentSuccessData: (state) => {
      state.paymentSuccessData = null;
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
        initializeSocket(action.payload.accessToken);
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.status = "failed";
        state.error = action.payload as string;
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("isAuthenticatedManuallySet");
        disconnectSocket();
      })
      .addCase(checkBanStatus.pending, (state) => {
        state.status = "loading";
      })
      .addCase(checkBanStatus.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(checkBanStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
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
        disconnectSocket();
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.status = "idle";
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("isAuthenticatedManuallySet");
        state.error = action.payload as string;
        disconnectSocket();
      });
  },
});

export const { setAuth, updateUser, logoutUserSync, setError, clearError, setAccessToken, setPaymentSuccessData, clearPaymentSuccessData } = authSlice.actions;
export default authSlice.reducer;