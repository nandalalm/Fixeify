
import api from "./axios";

interface AuthResponse {
  accessToken: string;
  user: { name: string; email: string; role: "user" | "pro" | "admin" };
}

interface User {
  id: string;
  name: string;
  email: string;
  phoneNo?: string | null;
  address?: string | null;
  isBanned: boolean;
  photo?: string | null;
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

export const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch("http://localhost:5000/api/users", {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json(); 
};

export const toggleBanUser = async (userId: string, isBanned: boolean): Promise<User> => {
  const response = await fetch(`http://localhost:5000/api/users/${userId}/ban`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ isBanned }),
  });
  if (!response.ok) throw new Error("Failed to toggle ban status");
  return response.json();
};