import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { PendingProModel, PendingProDocument } from "../models/pendingProModel";
import { ApprovedProModel, ApprovedProDocument } from "../models/approvedProModel";
import { IProRepository } from "./IProRepository";
import { ProResponse } from "../dtos/response/proDtos";
import { UserRole } from "../enums/roleEnum";

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

  async findApprovedProByEmail(email: string): Promise<ApprovedProDocument | null> {
    return ApprovedProModel.findOne({ email }).exec();
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
    return pro;
  }

  async approvePro(id: string, password: string, about: string): Promise<{ email: string; firstName: string; lastName: string }> {
    const pendingPro = await this.findById(id);
    if (!pendingPro) throw new Error("Pending pro not found");

    const approvedProData = {
      ...pendingPro.toObject(),
      password,
      isBanned: false,
      isBooked: false,
      about: about || null,
    };

    const approvedPro = await ApprovedProModel.create(approvedProData);
    await PendingProModel.findByIdAndDelete(id);

    return {
      email: approvedPro.email,
      firstName: approvedPro.firstName,
      lastName: approvedPro.lastName,
    };
  }

  async rejectPro(id: string): Promise<void> {
    const pendingPro = await this.findById(id);
    if (!pendingPro) throw new Error("Pending pro not found");
    await PendingProModel.findByIdAndDelete(id);
  }

  async getApprovedProsWithPagination(skip: number, limit: number): Promise<ProResponse[]> {
    const pros = await ApprovedProModel.find({}, { password: 0 }).skip(skip).limit(limit).exec();
    return pros.map(this.mapToProResponse);
  }

  async findApprovedProById(id: string): Promise<ApprovedProDocument | null> {
    return ApprovedProModel.findById(id).exec();
  }

  async getTotalApprovedProsCount(): Promise<number> {
    return ApprovedProModel.countDocuments({}).exec();
  }

  async findApprovedProByIdAsResponse(id: string): Promise<ProResponse | null> {
    const pro = await ApprovedProModel.findById(id, { password: 0 }).exec();
    return pro ? this.mapToProResponse(pro) : null;
  }

  async updateBanStatus(proId: string, isBanned: boolean): Promise<ApprovedProDocument | null> {
    const updatedPro = await ApprovedProModel.findByIdAndUpdate(
      proId,
      { isBanned },
      { new: true }
    ).exec();
    return updatedPro;
  }

  private mapToProResponse(pro: ApprovedProDocument): ProResponse {
    return new ProResponse({
      _id: pro._id.toString(),
      firstName: pro.firstName,
      role: UserRole.PRO,
      lastName: pro.lastName,
      email: pro.email,
      phoneNumber: pro.phoneNumber,
      serviceType: pro.serviceType,
      customService: pro.customService ?? null,
      skills: pro.skills,
      location: {
        address: pro.location.address,
        city: pro.location.city,
        state: pro.location.state,
        coordinates: pro.location.coordinates,
      },
      profilePhoto: pro.profilePhoto,
      idProof: pro.idProof,
      accountHolderName: pro.accountHolderName,
      accountNumber: pro.accountNumber,
      bankName: pro.bankName,
      availability: pro.availability,
      workingHours: pro.workingHours,
      isBanned: pro.isBanned,
      about: pro.about ?? null,
      isBooked: pro.isBooked,
    });
  }
}