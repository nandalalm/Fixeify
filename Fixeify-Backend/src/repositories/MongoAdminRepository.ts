import Admin, { IAdmin } from "../models/adminModel";
import { IAdminRepository, CreateAdminData } from "./IAdminRepository";
import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";

@injectable()
export class MongoAdminRepository extends BaseRepository<IAdmin> implements IAdminRepository {
  constructor() {
    super(Admin);
  }

  async createAdmin(adminData: CreateAdminData): Promise<IAdmin> {
    return this.create(adminData);
  }

  async findAdminByEmail(email: string): Promise<IAdmin | null> {
    return this.findOne({ email });
  }

  async findAdminById(adminId: string): Promise<IAdmin | null> {
    return this.findById(adminId); // Use BaseRepository's findById
  }
}