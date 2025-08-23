import { IRatingReview } from "../../models/ratingReviewModel";

export class RatingReviewResponse {
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

  constructor(doc: IRatingReview & {
    userId?: any;
    proId?: any;
  }) {
    this.id = doc._id.toString();
    this.user = {
      id: doc.userId?._id?.toString() || (doc.userId as any)?.toString?.() || "",
      name: (doc as any).userId?.name || "",
      email: (doc as any).userId?.email || null,
      phoneNo: (doc as any).userId?.phoneNo || null,
      photo: (doc as any).userId?.photo || null,
    };
    this.pro = {
      id: doc.proId?._id?.toString() || (doc.proId as any)?.toString?.() || "",
      firstName: (doc as any).proId?.firstName || "",
      lastName: (doc as any).proId?.lastName || "",
      email: (doc as any).proId?.email || null,
      phoneNumber: (doc as any).proId?.phoneNumber || null,
      profilePhoto: (doc as any).proId?.profilePhoto || null,
    };
    if ((doc as any).categoryId?.name) {
      this.category = {
        id: (doc as any).categoryId?._id?.toString() || (doc as any).categoryId?.toString(),
        name: (doc as any).categoryId.name,
        image: (doc as any).categoryId.image,
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
