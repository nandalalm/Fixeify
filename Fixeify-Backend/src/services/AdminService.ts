import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserRepository } from "../repositories/IUserRepository";
import { IProRepository } from "../repositories/IProRepository";
import { UserResponse } from "../dtos/response/userDtos";
import { IAdminService } from "./IAdminService";
import { UserRole } from "../enums/roleEnum";
import { IPendingPro, PendingProDocument } from "../models/pendingProModel";

@injectable()
export class AdminService implements IAdminService {
  constructor(
    @inject(TYPES.IUserRepository) private _userRepository: IUserRepository,
    @inject(TYPES.IProRepository) private _proRepository: IProRepository
  ) {}

  async getUsers(page: number, limit: number): Promise<{ users: UserResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this._userRepository.getUsersWithPagination(skip, limit),
      this._userRepository.getTotalUsersCount(),
    ]);
    return {
      users: users.map((user) => new UserResponse(user.id, user.name, user.email, UserRole.USER, null, null, null, user.isBanned)),
      total,
    };
  }

  async banUser(userId: string, isBanned: boolean): Promise<UserResponse | null> {
    const updatedUser = await this._userRepository.updateBanStatus(userId, isBanned);
    if (!updatedUser) return null;
    return new UserResponse(updatedUser.id, updatedUser.name, updatedUser.email, UserRole.USER, null, null, null, updatedUser.isBanned);
  }

  async getPendingPros(page: number, limit: number): Promise<{ pros: IPendingPro[]; total: number }> {
    const skip = (page - 1) * limit;
    const [pros, total] = await Promise.all([
      this._proRepository.getPendingProsWithPagination(skip, limit),
      this._proRepository.getTotalPendingProsCount(),
    ]);
    // Convert PendingProDocument[] to IPendingPro[]
    return { pros: pros.map((doc) => doc.toObject() as IPendingPro), total };
  }

  async getPendingProById(id: string): Promise<IPendingPro> {
    const proDoc = await this._proRepository.findById(id);
    if (!proDoc) {
      throw new Error("Pro not found");
    }
    // Convert Mongoose document to plain object matching IPendingPro
    return proDoc.toObject() as IPendingPro;
  }
}