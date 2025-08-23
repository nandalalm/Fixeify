import User, { IUser } from "../models/userModel";
import { IUserRepository, CreateUserData } from "./IUserRepository";
import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { UserResponse } from "../dtos/response/userDtos";
import { UserRole } from "../enums/roleEnum";

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

  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this._model.find({}, { password: 0, updatedAt: 0, __v: 0 }).exec();
    return users.map((user) => this.mapToUserResponse(user));
  }

  async getUsersWithPagination(skip: number, limit: number, sortBy?: "latest" | "oldest"): Promise<UserResponse[]> {
    const sortDirection = sortBy === "oldest" ? 1 : -1; // default to latest
    const users = await this._model
      .find({}, { password: 0, updatedAt: 0, __v: 0 })
      .sort({ createdAt: sortDirection })
      .skip(skip)
      .limit(limit)
      .exec();
    return users.map((user) => this.mapToUserResponse(user));
  }

  async getTotalUsersCount(): Promise<number> {
    return this._model.countDocuments().exec();
  }

  async updateBanStatus(userId: string, isBanned: boolean): Promise<UserResponse | null> {
    const user = await this.update(userId, { isBanned });
    return user ? this.mapToUserResponse(user) : null;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.delete(userId);
  }

  async updateUser(userId: string, data: Partial<IUser>): Promise<IUser | null> {
    return this.update(userId, data);
  }

  private mapToUserResponse(user: IUser): UserResponse {
    return new UserResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: UserRole.USER,
      photo: user.photo ?? null,
      phoneNo: user.phoneNo ?? null,
      address: user.address ? {
        address: user.address.address,
        city: user.address.city,
        state: user.address.state,
        coordinates: user.address.coordinates,
      } : null,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
    });
  }
}