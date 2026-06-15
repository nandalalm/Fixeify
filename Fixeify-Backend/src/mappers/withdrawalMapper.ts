import type { WithdrawalResponse } from "../dtos/response/withdrawalDtos";
import type { WithdrawalRequestRecord } from "../contracts/repository/withdrawalRecords";

export const toWithdrawalResponse = (withdrawalRequest: WithdrawalRequestRecord): WithdrawalResponse => ({
  id: withdrawalRequest._id.toString(),
  proId: withdrawalRequest.proId.toString(),
  amount: withdrawalRequest.amount,
  paymentMode: withdrawalRequest.paymentMode,
  bankName: withdrawalRequest.bankName || undefined,
  accountNumber: withdrawalRequest.accountNumber || undefined,
  ifscCode: withdrawalRequest.ifscCode || undefined,
  branchName: withdrawalRequest.branchName || undefined,
  upiCode: withdrawalRequest.upiCode || undefined,
  bookingId: withdrawalRequest.bookingId ? withdrawalRequest.bookingId.toString() : undefined,
  quotaId: withdrawalRequest.quotaId ? withdrawalRequest.quotaId.toString() : undefined,
  status: withdrawalRequest.status,
  rejectionReason: withdrawalRequest.rejectionReason || undefined,
  createdAt: withdrawalRequest.createdAt,
  updatedAt: withdrawalRequest.updatedAt,
});

export const toWithdrawalResponses = (withdrawalRequests: WithdrawalRequestRecord[]): WithdrawalResponse[] =>
  withdrawalRequests.map(toWithdrawalResponse);
