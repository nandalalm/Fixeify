export class WithdrawalRequestResponse {
  id: string;
  proId: string;
  amount: number;
  paymentMode: "bank" | "upi";
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiCode?: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    proId: string;
    amount: number;
    paymentMode: "bank" | "upi";
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
    upiCode?: string;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.proId = data.proId;
    this.amount = data.amount;
    this.paymentMode = data.paymentMode;
    this.bankName = data.bankName;
    this.accountNumber = data.accountNumber;
    this.ifscCode = data.ifscCode;
    this.branchName = data.branchName;
    this.upiCode = data.upiCode;
    this.status = data.status;
    this.rejectionReason = data.rejectionReason;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}