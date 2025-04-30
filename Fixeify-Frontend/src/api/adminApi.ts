import api from "./axios";

export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNo?: string | null;
  address?: ILocation | null;
  isBanned: boolean;
  photo?: string | null;
}

interface LocationData {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
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
  location: LocationData;
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

export interface IApprovedPro {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  serviceType: string;
  customService?: string | null;
  skills: string[];
  location: LocationData;
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
  isBanned: boolean;
  about?: string | null;
}

interface BanStatusResponse {
  isBanned: boolean;
}

export const fetchUsers = async (page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> => {
  const response = await api.get("/admin", {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const toggleBanUser = async (userId: string, isBanned: boolean): Promise<User> => {
  const response = await api.put(`/admin/users/${userId}/ban`, { isBanned }, { withCredentials: true });
  return response.data;
};

export const toggleBanPro = async (proId: string, isBanned: boolean): Promise<IApprovedPro> => {
  const response = await api.put(`/admin/approved-pros/${proId}/ban`, { isBanned }, { withCredentials: true });
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

export const approvePro = async (id: string, data: { about?: string | null }): Promise<void> => {
  const response = await api.post(`/admin/pending-pros/${id}/approve`, data, { withCredentials: true });
  return response.data;
};

export const rejectPro = async (id: string, data: { reason: string }): Promise<void> => {
  const response = await api.post(`/admin/pending-pros/${id}/reject`, data, { withCredentials: true });
  return response.data;
};

export const fetchApprovedPros = async (page: number = 1, limit: number = 10): Promise<{ pros: IApprovedPro[]; total: number }> => {
  const response = await api.get("/admin/approved-pros", {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const fetchApprovedProById = async (id: string): Promise<IApprovedPro> => {
  const response = await api.get(`/admin/approved-pros/${id}`, {
    withCredentials: true,
  });
  return response.data;
};

export const checkBanStatus = async (userId: string): Promise<BanStatusResponse> => {
  const response = await api.get(`/auth/check-ban/${userId}`, {
    withCredentials: true,
  });
  return response.data;
};