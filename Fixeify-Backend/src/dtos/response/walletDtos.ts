export interface WalletResponseDTO {
  id: string;
  proId: string;
  balance: number;
  transactions: {
    _id: string;
    amount: number;
    type: "credit" | "debit";
    date: Date;
    quotaId?: {
      id: string;
      bookingId?: string;
      userId?: string;
      totalCost?: number;
    };
  }[];
  createdAt: Date;
  updatedAt: Date;
}