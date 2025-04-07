import Admin, { IAdmin } from "../models/AdminModel";
import { IAdminRepository, CreateAdminData } from "./IAdminRepository";
import { injectable } from "inversify";

@injectable()
export class MongoAdminRepository implements IAdminRepository {
  async createAdmin(adminData: CreateAdminData): Promise<IAdmin> {
    return await Admin.create(adminData);
  }

  async findAdminByEmail(email: string): Promise<IAdmin | null> {
    return await Admin.findOne({ email });
  }
}