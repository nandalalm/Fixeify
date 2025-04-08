import { IAdmin } from "../models/adminModel";

export interface CreateAdminData {
  name: string;
  email: string;
  password: string;
}

export interface IAdminRepository {
  createAdmin(adminData: CreateAdminData): Promise<IAdmin>;
  findAdminByEmail(email: string): Promise<IAdmin | null>;
  findAdminById(adminId: string): Promise<IAdmin | null>; // Added method
}