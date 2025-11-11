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

  constructor(doc: unknown) {
    const docData = doc as Record<string, unknown>;
    this.id = (docData._id as Record<string, unknown>)?.toString() || "";
    this.user = {
      id: (docData.userId as Record<string, unknown>)?._id?.toString() || (docData.userId as Record<string, unknown>)?.toString?.() || "",
      name: (docData.userId as Record<string, unknown>)?.name as string || "",
      email: (docData.userId as Record<string, unknown>)?.email as string || null,
      phoneNo: (docData.userId as Record<string, unknown>)?.phoneNo as string || null,
      photo: (docData.userId as Record<string, unknown>)?.photo as string || null,
    };
    this.pro = {
      id: (docData.proId as Record<string, unknown>)?._id?.toString() || (docData.proId as Record<string, unknown>)?.toString?.() || "",
      firstName: (docData.proId as Record<string, unknown>)?.firstName as string || "",
      lastName: (docData.proId as Record<string, unknown>)?.lastName as string || "",
      email: (docData.proId as Record<string, unknown>)?.email as string || null,
      phoneNumber: (docData.proId as Record<string, unknown>)?.phoneNumber as string || null,
      profilePhoto: (docData.proId as Record<string, unknown>)?.profilePhoto as string || null,
    };
    if ((docData.categoryId as Record<string, unknown>)?.name) {
      this.category = {
        id: (docData.categoryId as Record<string, unknown>)?._id?.toString() || (docData.categoryId as Record<string, unknown>)?.toString(),
        name: (docData.categoryId as Record<string, unknown>).name as string,
        image: (docData.categoryId as Record<string, unknown>).image as string,
      };
    }
    if (docData.bookingId) {
      this.bookingId = ((docData.bookingId as Record<string, unknown>)._id?.toString?.() || (docData.bookingId as Record<string, unknown>).toString?.() || "");
      if ((docData.bookingId as Record<string, unknown>)?.issueDescription) {
        this.issueDescription = (docData.bookingId as Record<string, unknown>).issueDescription as string;
      }
    }
    if (docData.quotaId) this.quotaId = (docData.quotaId as Record<string, unknown>).toString();
    this.rating = docData.rating as number;
    if (docData.review) this.review = docData.review as string;
    this.createdAt = docData.createdAt as Date;
  }
}
