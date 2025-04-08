import api from "./axios";

interface User {
  id: string;
  name: string;
  email: string;
  phoneNo?: string | null;
  address?: string | null;
  isBanned: boolean;
  photo?: string | null;
}

export interface PendingPro {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  serviceType: string;
  customService?: string;
  skills: string[];
  location: string;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  workingHours: string;
  createdAt: Date;
}

export const fetchUsers = async (page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> => {
  const response = await api.get("/admin", {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const toggleBanUser = async (userId: string, isBanned: boolean): Promise<User> => {
  const response = await api.put(`/admin/${userId}/ban`, { isBanned }, { withCredentials: true });
  return response.data;
};

export const fetchPendingPros = async (page: number = 1, limit: number = 10): Promise<{ pros: PendingPro[]; total: number }> => {
  const response = await api.get("/admin/pending-pros", {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const fetchPendingProById = async (id: string): Promise<PendingPro> => {
  const response = await api.get(`/admin/pending-pros/${id}`, {
    withCredentials: true,
  });
  return response.data;
};