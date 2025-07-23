import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { IWithdrawalRequestRepository } from "./IWithdrawalRequestRepository";
import WithdrawalRequest, { WithdrawalRequestDocument } from "../models/withdrawalRequestModel";
import { WithdrawalRequestResponse } from "../dtos/response/withdrawalDtos";
import { Types } from "mongoose";

@injectable()
export class MongoWithdrawalRequestRepository extends BaseRepository<WithdrawalRequestDocument> implements IWithdrawalRequestRepository {
  constructor() {
    super(WithdrawalRequest);
  }

  async createWithdrawalRequest(data: Partial<WithdrawalRequestDocument>): Promise<WithdrawalRequestResponse> {
    const withdrawalRequest = await this._model.create(data);
    return this.mapToWithdrawalRequestResponse(withdrawalRequest);
  }

  async findWithdrawalRequestById(id: string): Promise<WithdrawalRequestResponse | null> {
    const withdrawalRequest = await this._model.findById(id).exec();
    return withdrawalRequest ? this.mapToWithdrawalRequestResponse(withdrawalRequest) : null;
  }

  async findWithdrawalRequestsByProId(proId: string): Promise<WithdrawalRequestResponse[]> {
    const withdrawalRequests = await this._model
      .find({ proId: new Types.ObjectId(proId) })
      .exec();
    return withdrawalRequests.map(this.mapToWithdrawalRequestResponse);
  }

  async updateWithdrawalRequest(id: string, data: Partial<WithdrawalRequestDocument>): Promise<WithdrawalRequestResponse | null> {
    const withdrawalRequest = await this._model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    return withdrawalRequest ? this.mapToWithdrawalRequestResponse(withdrawalRequest) : null;
  }

  async getAllWithdrawalRequests(skip: number, limit: number): Promise<WithdrawalRequestResponse[]> {
    const withdrawalRequests = await this._model
      .find({})
      .skip(skip)
      .limit(limit)
      .exec();
    return withdrawalRequests.map(this.mapToWithdrawalRequestResponse);
  }

  async getTotalWithdrawalRequestsCount(): Promise<number> {
    return this._model.countDocuments({}).exec();
  }

  private mapToWithdrawalRequestResponse(withdrawalRequest: WithdrawalRequestDocument): WithdrawalRequestResponse {
    return new WithdrawalRequestResponse({
      id: withdrawalRequest._id.toString(),
      proId: withdrawalRequest.proId.toString(),
      amount: withdrawalRequest.amount,
      paymentMode: withdrawalRequest.paymentMode,
      bankName: withdrawalRequest.bankName || undefined,
      accountNumber: withdrawalRequest.accountNumber || undefined,
      ifscCode: withdrawalRequest.ifscCode || undefined,
      branchName: withdrawalRequest.branchName || undefined,
      upiCode: withdrawalRequest.upiCode || undefined,
      status: withdrawalRequest.status,
      rejectionReason: withdrawalRequest.rejectionReason || undefined,
      createdAt: withdrawalRequest.createdAt,
      updatedAt: withdrawalRequest.updatedAt,
    });
  }
}