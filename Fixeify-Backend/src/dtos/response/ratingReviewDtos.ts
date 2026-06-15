export interface RatingReviewResponse {
  id: string;
  user: { id: string; name: string; email?: string | null; phoneNo?: string | null; photo?: string | null };
  pro: { id: string; firstName: string; lastName: string; email?: string | null; phoneNumber?: string | null; profilePhoto?: string | null };
  issueDescription?: string;
  bookingId?: string;
  quotaId?: string;
  category?: { id: string; name: string; image?: string };
  rating: number;
  review?: string;
  createdAt: Date;
}
