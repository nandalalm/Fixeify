export interface WalletResponseDTO {
  id: string;
  proId: string;
  balance: number;
  transactions: {
    _id: string;
    transactionId?: string;
    amount: number;
    type: "credit" | "debit";
    date: Date;
    description?: string;
    bookingId?: string;
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