import { IRatingReview } from "../models/ratingReviewModel";

export interface IRatingReviewRepository {
  create(data: Partial<IRatingReview>): Promise<IRatingReview>;
  findById(id: string): Promise<IRatingReview | null>;
  findByProId(
    proId: string,
    page: number,
    limit: number
  ): Promise<{ items: IRatingReview[]; total: number; page: number; limit: number }>;
  findByUserId(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: IRatingReview[]; total: number; page: number; limit: number }>;  
  
  // Admin: fetch all reviews paginated
  findAll(
    page: number,
    limit: number
  ): Promise<{ items: IRatingReview[]; total: number; page: number; limit: number }>;

  
  hasUserReviewedBookingOrQuota(
    userId: string,
    bookingId?: string,
    quotaId?: string
  ): Promise<boolean>;
}
