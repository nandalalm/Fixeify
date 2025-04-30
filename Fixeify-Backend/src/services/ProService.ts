import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProRepository } from "../repositories/IProRepository";
import { IPendingPro } from "../models/pendingProModel";
import { IProService } from "./IProService";
import { ProProfileResponse } from "../dtos/response/proDtos";
import { UserResponse } from "../dtos/response/userDtos";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import { ApprovedProDocument } from "../models/approvedProModel";
import { UserRole } from "../enums/roleEnum";
import bcrypt from "bcryptjs";

@injectable()
export class ProService implements IProService {
  constructor(@inject(TYPES.IProRepository) private _proRepository: IProRepository) {}

  async applyPro(proData: Partial<IPendingPro>): Promise<{ message: string; pendingPro: IPendingPro }> {
    const existingPending = await this._proRepository.findPendingProByEmail(proData.email!);
    if (existingPending) throw new HttpError(400, MESSAGES.APPLICATION_ALREADY_PENDING);
    const pendingPro = await this._proRepository.createPendingPro(proData);
    return { message: MESSAGES.APPLICATION_SUBMITTED_SUCCESSFULLY, pendingPro };
  }

  async getProfile(proId: string): Promise<ProProfileResponse> {
    const pro = await this._proRepository.findApprovedProByIdAsProfile(proId);
    if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
    return pro;
  }

  async updateProfile(proId: string, data: Partial<ProProfileResponse>): Promise<ProProfileResponse> {
    const existingPro = await this._proRepository.findApprovedProById(proId);
    if (!existingPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    const updateData = this.mapToApprovedProDocument(data, existingPro);

    if (!updateData.firstName) throw new HttpError(400, MESSAGES.FIRST_NAME_REQUIRED);
    if (!updateData.lastName) throw new HttpError(400, MESSAGES.LAST_NAME_REQUIRED);
    if (!updateData.phoneNumber) throw new HttpError(400, MESSAGES.PHONE_NUMBER_REQUIRED);
    if (!updateData.location) throw new HttpError(400, MESSAGES.LOCATION_REQUIRED);
    if (!updateData.profilePhoto) throw new HttpError(400, MESSAGES.PROFILE_PHOTO_REQUIRED);

    const updatedPro = await this._proRepository.updateApprovedPro(proId, updateData);
    if (!updatedPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    const profile = await this._proRepository.findApprovedProByIdAsProfile(proId);
    if (!profile) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);
    return profile;
  }

  async changePassword(
    proId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<UserResponse | null> {
    const pro = await this._proRepository.findApprovedProById(proId);
    if (!pro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    const isPasswordValid = await bcrypt.compare(data.currentPassword, pro.password);
    if (!isPasswordValid) {
      throw new HttpError(400, MESSAGES.INCORRECT_PASSWORD);
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

    const updateData: Partial<ApprovedProDocument> = {
      password: hashedNewPassword,
    };

    const updatedPro = await this._proRepository.updateApprovedPro(proId, updateData);
    if (!updatedPro) throw new HttpError(404, MESSAGES.PRO_NOT_FOUND);

    return this.mapToUserResponse(updatedPro);
  }

  private mapToApprovedProDocument(data: Partial<ProProfileResponse>, existingPro: ApprovedProDocument): Partial<ApprovedProDocument> {
    return {
      firstName: data.firstName !== undefined ? data.firstName : existingPro.firstName,
      lastName: data.lastName !== undefined ? data.lastName : existingPro.lastName,
      email: existingPro.email,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : existingPro.phoneNumber,
      location: data.location !== undefined ? data.location : existingPro.location,
      profilePhoto: data.profilePhoto !== undefined ? data.profilePhoto : existingPro.profilePhoto,
      about: data.about !== undefined ? data.about : existingPro.about,
      isBanned: existingPro.isBanned,
    };
  }

  private mapToUserResponse(pro: ApprovedProDocument): UserResponse {
    return new UserResponse({
      id: pro.id,
      name: `${pro.firstName} ${pro.lastName}`,
      email: pro.email,
      role: UserRole.PRO,
      photo: pro.profilePhoto ?? null,
      phoneNo: pro.phoneNumber ?? null,
      address: pro.location ? {
        address: pro.location.address,
        city: pro.location.city,
        state: pro.location.state,
        coordinates: pro.location.coordinates,
      } : null,
      isBanned: pro.isBanned,
    });
  }
}