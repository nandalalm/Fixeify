import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserRepository } from "../repositories/IUserRepository";
import { IProRepository } from "../repositories/IProRepository";
import { UserResponse } from "../dtos/response/userDtos";
import { IAdminService } from "./IAdminService";
import { UserRole } from "../enums/roleEnum";
import { IPendingPro } from "../models/pendingProModel";
import { ProResponse } from "../dtos/response/proDtos";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { getApprovalEmailTemplate, getRejectionEmailTemplate } from "../utils/emailTemplates";
import { createClient } from "redis";

@injectable()
export class AdminService implements IAdminService {
  private _redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
      keepAlive: 10000,
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    },
  });

  constructor(
    @inject(TYPES.IUserRepository) private _userRepository: IUserRepository,
    @inject(TYPES.IProRepository) private _proRepository: IProRepository
  ) {
    this._redisClient.connect().catch((err) => console.error("Failed to connect to Redis:", err));
    this._redisClient.on("error", (err) => console.error("Redis error:", err));
  }

  async getUsers(page: number, limit: number): Promise<{ users: UserResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this._userRepository.getUsersWithPagination(skip, limit),
      this._userRepository.getTotalUsersCount(),
    ]);
    return {
      users: users.map((user) =>
        new UserResponse({
          id: user.id,
          name: user.name,
          email: user.email,
          role: UserRole.USER,
          isBanned: user.isBanned,
          phoneNo: user.phoneNo ?? null,
          address: user.address ?? null,
          photo: user.photo ?? null,
        })
      ),
      total,
    };
  }

  async banUser(userId: string, isBanned: boolean): Promise<UserResponse | null> {
    const updatedUser = await this._userRepository.updateBanStatus(userId, isBanned);
    if (!updatedUser) return null;

    // Invalidate the user's session by deleting their refresh token
    if (isBanned) {
      await this._redisClient.del(`refresh:${userId}`);
    }

    return new UserResponse({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: UserRole.USER,
      isBanned: updatedUser.isBanned,
      phoneNo: updatedUser.phoneNo ?? null,
      address: updatedUser.address ?? null,
      photo: updatedUser.photo ?? null,
    });
  }

  async banPro(proId: string, isBanned: boolean): Promise<ProResponse | null> {
    const updatedPro = await this._proRepository.updateBanStatus(proId, isBanned);
    if (!updatedPro) return null;

    // Invalidate the pro's session by deleting their refresh token
    if (isBanned) {
      await this._redisClient.del(`refresh:${proId}`);
    }

    return new ProResponse({
      _id: updatedPro._id.toString(),
      firstName: updatedPro.firstName,
      role: UserRole.PRO,
      lastName: updatedPro.lastName,
      email: updatedPro.email,
      phoneNumber: updatedPro.phoneNumber,
      serviceType: updatedPro.serviceType,
      customService: updatedPro.customService,
      skills: updatedPro.skills,
      location: {
        address: updatedPro.location.address,
        city: updatedPro.location.city,
        state: updatedPro.location.state,
        coordinates: updatedPro.location.coordinates,
      },
      profilePhoto: updatedPro.profilePhoto,
      idProof: updatedPro.idProof,
      accountHolderName: updatedPro.accountHolderName,
      accountNumber: updatedPro.accountNumber,
      bankName: updatedPro.bankName,
      availability: updatedPro.availability,
      workingHours: updatedPro.workingHours,
      isBanned: updatedPro.isBanned,
      about: updatedPro.about,
      isBooked: updatedPro.isBooked,
    });
  }

  async getPendingPros(page: number, limit: number): Promise<{ pros: IPendingPro[]; total: number }> {
    const skip = (page - 1) * limit;
    const [pros, total] = await Promise.all([
      this._proRepository.getPendingProsWithPagination(skip, limit),
      this._proRepository.getTotalPendingProsCount(),
    ]);
    return { pros: pros.map((doc) => doc.toObject() as IPendingPro), total };
  }

  async getPendingProById(id: string): Promise<IPendingPro> {
    const proDoc = await this._proRepository.findById(id);
    if (!proDoc) {
      throw new Error("Pro not found");
    }
    return proDoc.toObject() as IPendingPro;
  }

  async approvePro(id: string, about: string | null): Promise<void> {
    const { plainPassword, hashedPassword } = await this.generatePassword();
    const { email, firstName, lastName } = await this._proRepository.approvePro(id, hashedPassword, about || "");
    console.log(`approve email: ${email}`);
    await this.sendApprovalEmail(email, `${firstName} ${lastName}`, plainPassword);
  }

  async rejectPro(id: string, reason: string): Promise<void> {
    const pendingPro = await this.getPendingProById(id);
    console.log(`reject email: ${pendingPro.email}`);
    await this._proRepository.rejectPro(id);
    await this.sendRejectionEmail(pendingPro.email, reason);
  }

  async getApprovedPros(page: number, limit: number): Promise<{ pros: ProResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [pros, total] = await Promise.all([
      this._proRepository.getApprovedProsWithPagination(skip, limit),
      this._proRepository.getTotalApprovedProsCount(),
    ]);
    return {
      pros: pros.map(
        (doc) =>
          new ProResponse({
            _id: doc._id.toString(),
            firstName: doc.firstName,
            role: UserRole.PRO,
            lastName: doc.lastName,
            email: doc.email,
            phoneNumber: doc.phoneNumber,
            serviceType: doc.serviceType,
            customService: doc.customService,
            skills: doc.skills,
            location: {
              address: doc.location.address,
              city: doc.location.city,
              state: doc.location.state,
              coordinates: doc.location.coordinates,
            },
            profilePhoto: doc.profilePhoto,
            idProof: doc.idProof,
            accountHolderName: doc.accountHolderName,
            accountNumber: doc.accountNumber,
            bankName: doc.bankName,
            availability: doc.availability,
            workingHours: doc.workingHours,
            isBanned: doc.isBanned,
            about: doc.about,
            isBooked: doc.isBooked,
          })
      ),
      total,
    };
  }

  async getApprovedProById(id: string): Promise<ProResponse> {
    const proDoc = await this._proRepository.findApprovedProById(id);
    if (!proDoc) {
      throw new Error("Approved pro not found");
    }
    return new ProResponse({
      _id: proDoc._id.toString(),
      firstName: proDoc.firstName,
      role: UserRole.PRO,
      lastName: proDoc.lastName,
      email: proDoc.email,
      phoneNumber: proDoc.phoneNumber,
      serviceType: proDoc.serviceType,
      customService: proDoc.customService,
      skills: proDoc.skills,
      location: {
        address: proDoc.location.address,
        city: proDoc.location.city,
        state: proDoc.location.state,
        coordinates: proDoc.location.coordinates,
      },
      profilePhoto: proDoc.profilePhoto,
      idProof: proDoc.idProof,
      accountHolderName: proDoc.accountHolderName,
      accountNumber: proDoc.accountNumber,
      bankName: proDoc.bankName,
      availability: proDoc.availability,
      workingHours: proDoc.workingHours,
      isBanned: proDoc.isBanned,
      about: proDoc.about,
      isBooked: proDoc.isBooked,
    });
  }

  private async generatePassword(): Promise<{ plainPassword: string; hashedPassword: string }> {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()";
    const all = uppercase + lowercase + numbers + special;
    const minLength = 10;

    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    while (password.length < minLength) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    password = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return { plainPassword: password, hashedPassword };
  }

  private async sendApprovalEmail(email: string, name: string, password: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Fixeify - Approved for Duty",
      html: getApprovalEmailTemplate(email, name, password),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Approval email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send approval email to ${email}:`, error);
      throw new Error("Failed to send approval email");
    }
  }

  private async sendRejectionEmail(email: string, reason: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Fixeify - Request Rejected",
      html: getRejectionEmailTemplate(reason),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Rejection email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send rejection email to ${email}:`, error);
      throw new Error("Failed to send rejection email");
    }
  }
}