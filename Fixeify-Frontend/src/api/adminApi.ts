import api from "./axios";

import { ICategory, User, PendingPro, IApprovedPro, BanStatusResponse } from "../interfaces/adminInterface";

export const fetchCategories = async (
  page: number = 1,
  limit: number = 5
): Promise<{ categories: ICategory[]; total: number }> => {
  const response = await api.get("/admin/fetchCategories", {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const addCategory = async (data: { name: string; image: string }): Promise<ICategory> => {
  const response = await api.post("/admin/addCategories", data, {
    withCredentials: true,
  });
  return response.data;
};

export const updateCategory = async (
  categoryId: string,
  data: { name?: string; image?: string }
): Promise<ICategory> => {
  const response = await api.put(`/admin/updateCategories/${categoryId}`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const fetchUsers = async (page: number = 1, limit: number = 5): Promise<{ users: User[]; total: number }> => {
  const response = await api.get("/admin/fetchUsers", {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const toggleBanUser = async (userId: string, isBanned: boolean): Promise<User> => {
  const response = await api.put(`/admin/banUsers/${userId}`, { isBanned }, { withCredentials: true });
  return response.data;
};

export const toggleBanPro = async (proId: string, isBanned: boolean): Promise<IApprovedPro> => {
  const response = await api.put(`/admin/banApproved-pros/${proId}`, { isBanned }, { withCredentials: true });
  return response.data;
};

export const fetchPendingPros = async (page: number = 1, limit: number = 5): Promise<{ pros: PendingPro[]; total: number }> => {
  const response = await api.get("/admin/fetchPending-pros", {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const fetchPendingProById = async (id: string): Promise<PendingPro> => {
  const response = await api.get(`/admin/fetchPending-pro/${id}`, {
    withCredentials: true,
  });
  return response.data;
};

export const approvePro = async (id: string, data: { about?: string | null }): Promise<void> => {
  const response = await api.post(`/admin/approvePending-pros/${id}`, data, { withCredentials: true });
  return response.data;
};

export const rejectPro = async (id: string, data: { reason: string }): Promise<void> => {
  const response = await api.post(`/admin/rejectPending-pros/${id}`, data, { withCredentials: true });
  return response.data;
};

export const fetchApprovedPros = async (page: number = 1, limit: number = 5): Promise<{ pros: IApprovedPro[]; total: number }> => {
  const response = await api.get("/admin/fetchApproved-pros", {
    params: { page, limit },
    withCredentials: true,
  });
  return response.data;
};

export const fetchApprovedProById = async (id: string): Promise<IApprovedPro> => {
  const response = await api.get(`/admin/fetchApproved-pro/${id}`, {
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