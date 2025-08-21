import api from "./axios";
import { User } from "../store/authSlice";
import { AuthBase } from "@/Constants/BaseRoutes";

interface AuthResponse {
  accessToken: string;
  user: User;
}

export const sendOtp = async (email: string): Promise<{ message: string }> => {
  const response = await api.post(`${AuthBase}/send-otp`, { email });
  return response.data;
};

export const verifyOtp = async (email: string, otp: string): Promise<{ message: string }> => {
  const response = await api.post(`${AuthBase}/verify-otp`, { email, otp });
  return response.data;
};

export const loginUser = async (
  email: string,
  password: string,
  role: "user" | "pro" | "admin"
): Promise<AuthResponse> => {
  const response = await api.post(`${AuthBase}/login`, { email, password, role });
  return response.data;
};

export const googleLogin = async (
  credential: string,
  role: "user"
): Promise<AuthResponse> => {
  const response = await api.post(`${AuthBase}/google-login`, { credential, role });
  return response.data;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  role: "user" | "admin"
): Promise<AuthResponse> => {
  const response = await api.post(`${AuthBase}/register`, { name, email, password, role });
  return response.data;
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await api.post(`${AuthBase}/forgot-password`, { email });
  return response.data;
};

export const resetPassword = async (
  userId: string,
  token: string,
  newPassword: string
): Promise<{ message: string }> => {
  const response = await api.post(`${AuthBase}/reset-password`, { userId, token, newPassword });
  return response.data;
};