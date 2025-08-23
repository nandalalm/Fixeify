import { IUser } from "../models/userModel";
import { UserResponse } from "../dtos/response/userDtos";

export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  photo?: string | null;
  phoneNo?: string | null;
  address?: ILocation | null;
}

export interface IUserRepository {
  findUserById(userId: string): Promise<IUser | null>;
  createUser(userData: Partial<IUser>): Promise<IUser>;
  findUserByEmail(email: string): Promise<IUser | null>;
  getAllUsers(): Promise<UserResponse[]>;
  updateBanStatus(userId: string, isBanned: boolean): Promise<UserResponse | null>;
  getUsersWithPagination(skip: number, limit: number, sortBy?: "latest" | "oldest"): Promise<UserResponse[]>;
  getTotalUsersCount(): Promise<number>;
  deleteUser(userId: string): Promise<void>;
  updateUser(userId: string, data: Partial<IUser>): Promise<IUser | null>;
}