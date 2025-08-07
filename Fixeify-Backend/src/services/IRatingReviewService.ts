import { CreateRatingReviewRequest } from "../dtos/request/ratingReviewDtos";
import { RatingReviewResponse } from "../dtos/response/ratingReviewDtos";

export interface IRatingReviewService {
  createRatingReview(data: CreateRatingReviewRequest): Promise<RatingReviewResponse>;
  getRatingReviewsByPro(
    proId: string,
    page: number,
    limit: number
  ): Promise<{ items: RatingReviewResponse[]; total: number; page: number; limit: number }>;
  getRatingReviewsByUser(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: RatingReviewResponse[]; total: number; page: number; limit: number }>;
  getRatingReviewById(id: string): Promise<RatingReviewResponse | null>;
  // Admin: fetch all reviews paginated
  getAllRatingReviews(page: number, limit: number): Promise<{ items: RatingReviewResponse[]; total: number; page: number; limit: number }>;

}
