import { WithdrawalRequestDocument } from "../models/withdrawalRequestModel";
import { WithdrawalRequestResponse } from "../dtos/response/withdrawalDtos";

export interface IWithdrawalRequestRepository {
  createWithdrawalRequest(data: Partial<WithdrawalRequestDocument>): Promise<WithdrawalRequestResponse>;
  findWithdrawalRequestById(id: string): Promise<WithdrawalRequestResponse | null>;
  findWithdrawalRequestsByProId(proId: string): Promise<WithdrawalRequestResponse[]>;
  findWithdrawalRequestsByProIdPaginated(proId: string, skip: number, limit: number): Promise<WithdrawalRequestResponse[]>;
  updateWithdrawalRequest(id: string, data: Partial<WithdrawalRequestDocument>): Promise<WithdrawalRequestResponse | null>;
  getAllWithdrawalRequests(skip: number, limit: number): Promise<WithdrawalRequestResponse[]>;
  getTotalWithdrawalRequestsCount(): Promise<number>;
  getTotalWithdrawalRequestsCountByProId(proId: string): Promise<number>;
  getTotalWithdrawnByProId(proId: string): Promise<number>;
}