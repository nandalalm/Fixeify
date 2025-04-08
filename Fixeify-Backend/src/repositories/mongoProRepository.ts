import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { PendingProModel, IPendingPro, PendingProDocument } from "../models/pendingProModel";
import { IProRepository } from "./IProRepository";

@injectable()
export class MongoProRepository extends BaseRepository<PendingProDocument> implements IProRepository {
  constructor() {
    super(PendingProModel);
  }

  async createPendingPro(proData: Partial<PendingProDocument>): Promise<PendingProDocument> {
    return this.create(proData);
  }

  async findPendingProByEmail(email: string): Promise<PendingProDocument | null> {
    return this.findOne({ email });
  }

  async getPendingProsWithPagination(skip: number, limit: number): Promise<PendingProDocument[]> {
    return this._model.find({}).skip(skip).limit(limit).exec();
  }

  async getTotalPendingProsCount(): Promise<number> {
    return this._model.countDocuments({}).exec();
  }

  async findById(id: string): Promise<PendingProDocument | null> {
    const pro = await this._model.findById(id).exec();
    if (!pro) {
      throw new Error("Pro not found");
    }
    return pro; // Return Mongoose document
  }
}