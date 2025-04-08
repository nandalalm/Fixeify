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
    return this.findById(userId); // Use BaseRepository's findById
  }

  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this._model.find({}, { password: 0, createdAt: 0, updatedAt: 0, __v: 0 }).exec();
    return users.map((user) => this.mapToUserResponse(user));
  }

  async getUsersWithPagination(skip: number, limit: number): Promise<UserResponse[]> {
    const users = await this._model
      .find({}, { password: 0, createdAt: 0, updatedAt: 0, __v: 0 })
      .skip(skip)
      .limit(limit)
      .exec();
    return users.map((user) => this.mapToUserResponse(user));
  }

  async getTotalUsersCount(): Promise<number> {
    return this._model.countDocuments().exec();
  }

  async updateBanStatus(userId: string, isBanned: boolean): Promise<UserResponse | null> {
    const user = await this._model.findByIdAndUpdate(userId, { isBanned }, { new: true }).exec();
    if (!user) return null;
    return this.mapToUserResponse(user);
  }

  private mapToUserResponse(user: IUser): UserResponse {
    return new UserResponse(
      user.id,
      user.name,
      user.email,
      UserRole.USER,
      user.photo ?? null,
      user.phoneNo ?? null,
      user.address ?? null,
      user.isBanned
    );
  }
}