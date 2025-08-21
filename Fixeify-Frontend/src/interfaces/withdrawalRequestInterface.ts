export interface WithdrawalFormData {
  amount: number | string;
  paymentMode: "bank" | "upi";
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiCode?: string;
  bookingId?: string; // optional: link this withdrawal to a booking
}

export interface IWithdrawalRequest {
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