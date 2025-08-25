import { CreateRatingReviewRequest } from "../dtos/request/ratingReviewDtos";
import { RatingReviewResponse } from "../dtos/response/ratingReviewDtos";

export interface IRatingReviewService {
  createRatingReview(data: CreateRatingReviewRequest): Promise<RatingReviewResponse>;
  getRatingReviewsByPro(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "lowest" | "highest",
    search?: string
  ): Promise<{ items: RatingReviewResponse[]; total: number; page: number; limit: number }>;
  getRatingReviewsByUser(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: RatingReviewResponse[]; total: number; page: number; limit: number }>;
  getRatingReviewById(id: string): Promise<RatingReviewResponse | null>;
  getAllRatingReviews(
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "lowest" | "highest",
    search?: string
  ): Promise<{ items: RatingReviewResponse[]; total: number; page: number; limit: number }>;

}
