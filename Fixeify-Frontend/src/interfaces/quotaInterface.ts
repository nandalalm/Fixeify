export interface Quota {
  id?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  }; 
  pro?: {
    id: string;
    firstName: string;
    lastName: string;
  }; 
  bookingId?: string; 
  category?: {
    id: string;
    name: string;
    image?: string;
  }; 
  laborCost: number; 
  materialCost?: number; 
  additionalCharges?: number; 
  totalCost?: number; 
  paymentStatus?: "pending" | "completed" | "failed";
  createdAt?: Date; 
  updatedAt?: Date;
}

export type QuotaRequest = Pick<Quota, "laborCost" | "materialCost" | "additionalCharges">;
export type QuotaResponse = Required<
  Pick<Quota, "id" | "bookingId" | "laborCost" | "materialCost" | "additionalCharges" | "totalCost" | "paymentStatus" | "createdAt" | "updatedAt">
> &
  Partial<Pick<Quota, "user" | "pro" | "category">>;