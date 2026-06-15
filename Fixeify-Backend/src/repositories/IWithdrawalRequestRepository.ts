import type { ClientSession } from "mongoose";
import type { WithdrawalRequestDocument } from "../models/withdrawalRequestModel";
import type { CreateWithdrawalRequestData, UpdateWithdrawalRequestData, WithdrawalRequestRecord } from "../contracts/repository/withdrawalRecords";

export interface IWithdrawalRequestRepository {
  createWithdrawalRequest(data: CreateWithdrawalRequestData, session?: ClientSession): Promise<WithdrawalRequestRecord>;
  findWithdrawalRequestById(id: string, session?: ClientSession): Promise<WithdrawalRequestRecord | null>;
  findWithdrawalRequestsByProId(proId: string): Promise<WithdrawalRequestRecord[]>;
  findWithdrawalRequestsByProIdPaginated(
    proId: string,
    skip: number,
    limit: number,
    sortBy?: "latest" | "oldest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<WithdrawalRequestRecord[]>;
  updateWithdrawalRequest(id: string, data: UpdateWithdrawalRequestData | Partial<WithdrawalRequestDocument>, session?: ClientSession): Promise<WithdrawalRequestRecord | null>;
  getAllWithdrawalRequests(
    skip: number,
    limit: number,
    sortBy?: "latest" | "oldest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<WithdrawalRequestRecord[]>;
  getTotalWithdrawalRequestsCount(status?: "pending" | "approved" | "rejected"): Promise<number>;
  getTotalWithdrawalRequestsCountByProId(proId: string): Promise<number>;
  getTotalWithdrawnByProId(proId: string): Promise<number>;
}
