import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  name: string;
  email: string;
  role: "user" | "pro" | "admin"; 
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
}

const loadState = (): AuthState => {
  const savedState = localStorage.getItem("authState");
  return savedState ? JSON.parse(savedState) : { user: null, accessToken: null };
};

const initialState: AuthState = loadState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem("authState", JSON.stringify(state));
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      localStorage.setItem("authState", JSON.stringify(state));
    },
    logoutUser: (state) => {
      state.user = null;
      state.accessToken = null;
      localStorage.removeItem("authState");
    },
  },
});

export const { setUser, setAccessToken, logoutUser } = authSlice.actions;
export default authSlice.reducer;