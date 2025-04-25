import api from "./axios";
// @ts-ignore
import { User, UserRole } from "../store/authSlice"; 

interface AuthResponse {
  accessToken: string;
  user: User;
}

export const sendOtp = async (email: string): Promise<{ message: string }> => {
  const response = await api.post("/auth/send-otp", { email });
  return response.data;
};

export const verifyOtp = async (email: string, otp: string): Promise<{ message: string }> => {
  const response = await api.post("/auth/verify-otp", { email, otp });
  return response.data;
};

export const loginUser = async (
  email: string,
  password: string,
  role: "user" | "pro" | "admin"
): Promise<AuthResponse> => {
  const response = await api.post("/auth/login", { email, password, role });
  return response.data;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  role: "user" | "admin"
): Promise<AuthResponse> => {
  const response = await api.post("/auth/register", { name, email, password, role });
  return response.data;
};