import axiosInstance from "./axios";

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
  user: { id: string; name: string; email: string };
  pro: { id: string; firstName: string; lastName: string };
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

const BASE = "/rating-reviews";

export const createReview = async (payload: CreateReviewPayload): Promise<RatingReviewResponse> => {
  const { data } = await axiosInstance.post(`${BASE}/create`, payload);
  return data;
};

export const getReviewsByPro = async (
  proId: string,
  page: number = 1,
  limit: number = 5
): Promise<PaginatedReviews> => {
  const { data } = await axiosInstance.get(`${BASE}/pro/${proId}`, { params: { page, limit } });
  return data;
};

export const getReviewsByUser = async (
  userId: string,
  page: number = 1,
  limit: number = 5
): Promise<PaginatedReviews> => {
  const { data } = await axiosInstance.get(`${BASE}/user/${userId}`, { params: { page, limit } });
  return data;
};

export const getSingleReview = async (id: string): Promise<RatingReviewResponse> => {
  const { data } = await axiosInstance.get(`${BASE}/fetchSingle/${id}`);
  return data;
};

// Admin: fetch all reviews paginated
export const getAllReviews = async (
  page: number = 1,
  limit: number = 5
): Promise<PaginatedReviews> => {
  const { data } = await axiosInstance.get(`${BASE}/all`, { params: { page, limit } });
  return data;
};
