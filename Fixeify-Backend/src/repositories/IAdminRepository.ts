import { IAdmin } from "../models/AdminModel";

export interface CreateAdminData {
  name: string;
  email: string;
  password: string;
}

export interface IAdminRepository {
  createAdmin(adminData: CreateAdminData): Promise<IAdmin>;
  findAdminByEmail(email: string): Promise<IAdmin | null>;
}