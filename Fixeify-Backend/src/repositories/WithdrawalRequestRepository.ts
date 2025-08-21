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
      .sort({ createdAt: -1 })
      .exec();
    return withdrawalRequests.map(this.mapToWithdrawalRequestResponse);
  }

  async findWithdrawalRequestsByProIdPaginated(proId: string, skip: number, limit: number): Promise<WithdrawalRequestResponse[]> {
    const withdrawalRequests = await this._model
      .find({ proId: new Types.ObjectId(proId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    return withdrawalRequests.map(this.mapToWithdrawalRequestResponse);
  }

  async getTotalWithdrawalRequestsCount(): Promise<number> {
    return this._model.countDocuments({}).exec();
  }

  async getTotalWithdrawalRequestsCountByProId(proId: string): Promise<number> {
    return this._model.countDocuments({ proId: new Types.ObjectId(proId) }).exec();
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
      bookingId: withdrawalRequest.bookingId ? withdrawalRequest.bookingId.toString() : undefined,
      quotaId: withdrawalRequest.quotaId ? withdrawalRequest.quotaId.toString() : undefined,
      status: withdrawalRequest.status,
      rejectionReason: withdrawalRequest.rejectionReason || undefined,
      createdAt: withdrawalRequest.createdAt,
      updatedAt: withdrawalRequest.updatedAt,
    });
  }

  async getTotalWithdrawnByProId(proId: string): Promise<number> {
    const result = await this._model.aggregate([
      {
        $match: {
          proId: new Types.ObjectId(proId),
          status: "approved"
        }
      },
      {
        $group: {
          _id: null,
          totalWithdrawn: { $sum: "$amount" }
        }
      }
    ]);

    return result[0]?.totalWithdrawn || 0;
  }
}