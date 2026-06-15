export interface WithdrawalResponse {
  id: string;
  proId: string;
  amount: number;
  paymentMode: "bank" | "upi";
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiCode?: string;
  bookingId?: string;
  quotaId?: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
