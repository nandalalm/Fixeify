import api from "./axios";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNo?: string | null;
  address?: {
    address: string;
    city: string;
    state: string;
    coordinates: { type: "Point"; coordinates: [number, number] };
  } | null;
  photo?: string | null;
}

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await api.get(`/user/getProfile/${userId}`, { withCredentials: true });
  return response.data;
};

export const updateUserProfile = async (userId: string, data: Partial<Omit<UserProfile, "email">>): Promise<UserProfile> => {
  const response = await api.put(`/user/updateProfile/${userId}`, data, { withCredentials: true });
  return response.data;
};

export const changeUserPassword = async (userId: string, data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> => {
  const response = await api.put(`/user/changePassword/${userId}`, data, { withCredentials: true });
  return response.data;
};