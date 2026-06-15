import type { IUser } from "../models/userModel";

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
  getAllUsers(): Promise<IUser[]>;
  updateBanStatus(userId: string, isBanned: boolean): Promise<IUser | null>;
  getUsersWithPagination(skip: number, limit: number, sortBy?: "latest" | "oldest"): Promise<IUser[]>;
  getTotalUsersCount(): Promise<number>;
  deleteUser(userId: string): Promise<void>;
  updateUser(userId: string, data: Partial<IUser>): Promise<IUser | null>;
}
