export interface CreateRatingReviewRequest {
  userId: string; // current logged user
  proId: string;
  categoryId: string;
  bookingId?: string;
  quotaId?: string;
  rating: number; // 1-5
  review?: string;
}
