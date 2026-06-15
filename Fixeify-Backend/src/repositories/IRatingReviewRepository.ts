import type {
  CreateRatingReviewData,
  PopulatedRatingReviewRecord,
  RatingReviewListRecord,
} from "../contracts/repository/ratingReviewRecords";

export interface IRatingReviewRepository {
  createRatingReview(data: CreateRatingReviewData): Promise<PopulatedRatingReviewRecord>;
  findById(id: string): Promise<PopulatedRatingReviewRecord | null>;
  findByProId(
    proId: string,
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "lowest" | "highest",
    search?: string
  ): Promise<RatingReviewListRecord>;
  findByUserId(
    userId: string,
    page: number,
    limit: number
  ): Promise<RatingReviewListRecord>;  
  
  findAll(
    page: number,
    limit: number,
    sortBy?: "latest" | "oldest" | "lowest" | "highest",
    search?: string
  ): Promise<RatingReviewListRecord>;

  
  hasUserReviewedBookingOrQuota(
    userId: string,
    bookingId?: string,
    quotaId?: string
  ): Promise<boolean>;
}
