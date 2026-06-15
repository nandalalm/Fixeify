import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import type { IWithdrawalRequestRepository } from "./IWithdrawalRequestRepository";
import WithdrawalRequest, { type WithdrawalRequestDocument } from "../models/withdrawalRequestModel";
import { type ClientSession, type FilterQuery, Types } from "mongoose";
import type { CreateWithdrawalRequestData, TotalWithdrawnAggregateRecord, UpdateWithdrawalRequestData, WithdrawalRequestRecord } from "../contracts/repository/withdrawalRecords";

@injectable()
export class MongoWithdrawalRequestRepository extends BaseRepository<WithdrawalRequestDocument> implements IWithdrawalRequestRepository {
  constructor() {
    super(WithdrawalRequest);
  }

  async createWithdrawalRequest(data: CreateWithdrawalRequestData, session?: ClientSession): Promise<WithdrawalRequestRecord> {
    const withdrawalRequests = await this._model.create([data], { session });
    return withdrawalRequests[0];
  }

  async findWithdrawalRequestById(id: string, session?: ClientSession): Promise<WithdrawalRequestRecord | null> {
    return this._model.findById(id).session(session || null).exec();
  }

  async findWithdrawalRequestsByProId(proId: string): Promise<WithdrawalRequestRecord[]> {
    return this._model
      .find({ proId: new Types.ObjectId(proId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findWithdrawalRequestsByProIdPaginated(
    proId: string,
    skip: number,
    limit: number,
    sortBy: "latest" | "oldest" = "latest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<WithdrawalRequestRecord[]> {
    const query: FilterQuery<WithdrawalRequestDocument> = { proId: new Types.ObjectId(proId) };
    if (status) query.status = status;
    const sortOrder = sortBy === "oldest" ? 1 : -1;
    return this._model
      .find(query)
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async updateWithdrawalRequest(id: string, data: UpdateWithdrawalRequestData | Partial<WithdrawalRequestDocument>, session?: ClientSession): Promise<WithdrawalRequestRecord | null> {
    return this._model
      .findByIdAndUpdate(id, data, { new: true, session })
      .exec();
  }

  async getAllWithdrawalRequests(
    skip: number,
    limit: number,
    sortBy: "latest" | "oldest" = "latest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<WithdrawalRequestRecord[]> {
    const query: FilterQuery<WithdrawalRequestDocument> = {};
    if (status) query.status = status;
    const sortOrder = sortBy === "oldest" ? 1 : -1;
    return this._model
      .find(query)
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getTotalWithdrawalRequestsCount(status?: "pending" | "approved" | "rejected"): Promise<number> {
    const query: FilterQuery<WithdrawalRequestDocument> = {};
    if (status) query.status = status;
    return this._model.countDocuments(query).exec();
  }

  async getTotalWithdrawalRequestsCountByProId(proId: string): Promise<number> {
    return this._model.countDocuments({ proId: new Types.ObjectId(proId) }).exec();
  }

  async getTotalWithdrawnByProId(proId: string): Promise<number> {
    const result = await this._model.aggregate<TotalWithdrawnAggregateRecord>([
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
