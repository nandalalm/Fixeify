import axiosInstance from "./axios";
import { ReviewBase } from "@/Constants/BaseRoutes";

export interface CreateReviewPayload {
  userId: string;
  proId: string;
  categoryId: string;
  bookingId?: string;
  quotaId?: string;
  rating: number;
  review?: string;
}

export interface RatingReviewResponse {
  category: { id: string; name: string; image?: string };

  id: string;
  user: { id: string; name: string; email: string; phoneNo?: string; photo?: string };
  pro: { id: string; firstName: string; lastName: string; email?: string; phoneNumber?: string; profilePhoto?: string };
  bookingId?: string;
  quotaId?: string;
  rating: number;
  review?: string;
  createdAt: string;
}

export interface PaginatedReviews {
  items: RatingReviewResponse[];
  total: number;
  page: number;
  limit: number;
}

export const createReview = async (payload: CreateReviewPayload): Promise<RatingReviewResponse> => {
  const { data } = await axiosInstance.post(`${ReviewBase}/create`, payload);
  return data;
};

export const getReviewsByPro = async (
  proId: string,
  page: number = 1,
  limit: number = 5,
  sortBy?: "latest" | "oldest" | "lowest" | "highest",
  search?: string
): Promise<PaginatedReviews> => {
  const params: Record<string, string | number> = { page, limit };
  if (sortBy) params.sortBy = sortBy;
  if (search) params.search = search;
  const { data } = await axiosInstance.get(`${ReviewBase}/pro/${proId}`, { params });
  return data;
};

export const getReviewsByUser = async (
  userId: string,
  page: number = 1,
  limit: number = 5
): Promise<PaginatedReviews> => {
  const { data } = await axiosInstance.get(`${ReviewBase}/user/${userId}`, { params: { page, limit } });
  return data;
};

export const getSingleReview = async (id: string): Promise<RatingReviewResponse> => {
  const { data } = await axiosInstance.get(`${ReviewBase}/fetchSingle/${id}`);
  return data;
};

export const getAllReviews = async (
  page: number = 1,
  limit: number = 5,
  sortBy?: "latest" | "oldest" | "lowest" | "highest",
  search?: string
): Promise<PaginatedReviews> => {
  const params: Record<string, string | number> = { page, limit };
  if (sortBy) params.sortBy = sortBy;
  if (search) params.search = search;
  const { data } = await axiosInstance.get(`${ReviewBase}/all`, { params });
  return data;
};
