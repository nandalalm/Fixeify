export interface CreateRatingReviewRequest {
  userId: string;
  proId: string;
  categoryId: string;
  bookingId?: string;
  quotaId?: string;
  rating: number;
  review?: string;
}
