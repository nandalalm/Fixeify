export interface QuotaResponse {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  pro: {
    id: string;
    firstName: string;
    lastName: string;
  };
  bookingId: string;
  category: {
    id: string;
    name: string;
    image?: string;
  };
  laborCost: number;
  materialCost: number;
  additionalCharges: number;
  totalCost: number;
  paymentStatus: "pending" | "completed" | "failed";
  paymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
