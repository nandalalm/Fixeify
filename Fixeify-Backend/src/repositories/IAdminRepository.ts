import { IAdmin } from "../models/tempAdminModel";

export interface CreateAdminData {
  name: string;
  email: string;
  password: string;
}

export interface IAdminRepository {
  createAdmin(adminData: CreateAdminData): Promise<IAdmin>;
  findAdminByEmail(email: string): Promise<IAdmin | null>;
  findAdminById(adminId: string): Promise<IAdmin | null>;
  updateRevenue(adminId: string, amount: number): Promise<IAdmin | null>; 
  find(): Promise<IAdmin | null>; 
  getAdminRevenue(adminId: string): Promise<number>;
}