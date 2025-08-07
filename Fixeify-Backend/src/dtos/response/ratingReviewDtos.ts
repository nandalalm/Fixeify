import { IRatingReview } from "../../models/ratingReviewModel";

export class RatingReviewResponse {
  id: string;
  user: { id: string; name: string; avatar?: string | null };
  pro: { id: string; firstName: string; lastName: string; avatar?: string | null };
  service?: string;
  issueDescription?: string;
  bookingId?: string;
  quotaId?: string;
  category?: { id: string; name: string; image?: string };
  rating: number;
  review?: string;
  createdAt: Date;

  constructor(doc: IRatingReview & {
    userId?: any;
    proId?: any;
  }) {
    this.id = doc._id.toString();
    this.user = {
      id: doc.userId?._id?.toString() || doc.userId?.toString(),
      name: doc.userId?.name || "",
      avatar: doc.userId?.avatar || null,
    };
    this.pro = {
      id: doc.proId?._id?.toString() || doc.proId?.toString(),
      firstName: doc.proId?.firstName || "",
      lastName: doc.proId?.lastName || "",
      avatar: doc.proId?.avatar || null,
    };
    // Set category object if available
    if ((doc as any).categoryId?.name) {
      this.category = {
        id: (doc as any).categoryId?._id?.toString() || (doc as any).categoryId?.toString(),
        name: (doc as any).categoryId.name,
        image: (doc as any).categoryId.image,
      };
    } else if (doc.bookingId && (doc as any).bookingId?.category?.name) {
      this.category = {
        id: (doc as any).bookingId.category._id?.toString() || (doc as any).bookingId.category.toString(),
        name: (doc as any).bookingId.category.name,
        image: (doc as any).bookingId.category.image,
      };
    }
    if (doc.bookingId) {
      this.bookingId = (doc.bookingId._id?.toString?.() || doc.bookingId.toString?.() || "");
      if ((doc as any).bookingId?.issueDescription) {
        this.issueDescription = (doc as any).bookingId.issueDescription;
      }
    }
    if (doc.quotaId) this.quotaId = doc.quotaId.toString();
    this.rating = doc.rating;
    if (doc.review) this.review = doc.review;
    this.createdAt = doc.createdAt;
  }
}
