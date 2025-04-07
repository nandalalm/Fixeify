import User, { IUser } from "../models/UserModel";
import { IUserRepository, CreateUserData } from "./IUserRepository";
import { injectable } from "inversify";

@injectable()
export class MongoUserRepository implements IUserRepository {
  async createUser(userData: CreateUserData): Promise<IUser> {
    return await User.create(userData);
  }

  async findUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email }).exec();
  }

  async updateRefreshToken(userId: string, refreshToken: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { refreshToken },
      { new: true }
    ).exec();
  }

  async getAllUsers(): Promise<IUser[]> {
    return await User.find({}, { password: 0 }).exec();
  }

  async updateBanStatus(userId: string, isBanned: boolean): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { isBanned },
      { new: true } 
    ).exec();
  }
}