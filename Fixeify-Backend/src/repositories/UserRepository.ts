import User, { IUser } from "../models/userModel";
import { IUserRepository, CreateUserData } from "./IUserRepository";
import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";

@injectable()
export class MongoUserRepository extends BaseRepository<IUser> implements IUserRepository {
  constructor() {
    super(User);
  }

  async createUser(userData: CreateUserData): Promise<IUser> {
    return this.create(userData);
  }

  async findUserByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email });
  }

  async findUserById(userId: string): Promise<IUser | null> {
    return this.findById(userId);
  }

  async getAllUsers(): Promise<IUser[]> {
    return this._model.find({}, { password: 0, updatedAt: 0, __v: 0 }).exec();
  }

  async getUsersWithPagination(skip: number, limit: number, sortBy?: "latest" | "oldest"): Promise<IUser[]> {
    const sortDirection = sortBy === "oldest" ? 1 : -1;
    return this._model
      .find({}, { password: 0, updatedAt: 0, __v: 0 })
      .sort({ createdAt: sortDirection })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getTotalUsersCount(): Promise<number> {
    return this._model.countDocuments().exec();
  }

  async updateBanStatus(userId: string, isBanned: boolean): Promise<IUser | null> {
    return this.update(userId, { isBanned });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.delete(userId);
  }

  async updateUser(userId: string, data: Partial<IUser>): Promise<IUser | null> {
    return this.update(userId, data);
  }
}
