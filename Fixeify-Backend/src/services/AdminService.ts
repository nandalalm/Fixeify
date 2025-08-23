import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserRepository } from "../repositories/IUserRepository";
import { IAdminRepository } from "../repositories/IAdminRepository";
import { IProRepository } from "../repositories/IProRepository";
import { ICategoryRepository } from "../repositories/ICategoryRepository";
import { IBookingRepository } from "../repositories/IBookingRepository";
import { IQuotaRepository } from "../repositories/IQuotaRepository";
import { IWalletRepository } from "../repositories/IWalletRepository";
import { IWithdrawalRequestRepository } from "../repositories/IWithdrawalRequestRepository";
import { ITransactionRepository } from "../repositories/ITransactionRepository";
import { UserResponse } from "../dtos/response/userDtos";
import { IAdminService } from "./IAdminService";
import { UserRole } from "../enums/roleEnum";
import { PendingProDocument } from "../models/pendingProModel";
import { ProResponse, PendingProResponse } from "../dtos/response/proDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";
import { QuotaResponse } from "../dtos/response/quotaDtos";
import { WithdrawalRequestResponse } from "../dtos/response/withdrawalDtos";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { getApprovalEmailTemplate, getRejectionEmailTemplate } from "../utils/emailTemplates";
import RedisConnector from "../config/redisConnector";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { HttpStatus } from "../enums/httpStatus";
import { INotificationService } from "./INotificationService";

@injectable()
export class AdminService implements IAdminService {
  private _redisConnector: RedisConnector;
  private _quotaRepository: IQuotaRepository;

  constructor(
    @inject(TYPES.IUserRepository) private _userRepository: IUserRepository,
    @inject(TYPES.IAdminRepository) private _adminRepository: IAdminRepository,
    @inject(TYPES.IProRepository) private _proRepository: IProRepository,
    @inject(TYPES.ICategoryRepository) private _categoryRepository: ICategoryRepository,
    @inject(TYPES.IBookingRepository) private _bookingRepository: IBookingRepository,
    @inject(TYPES.IQuotaRepository) quotaRepository: IQuotaRepository,
    @inject(TYPES.IWalletRepository) private _walletRepository: IWalletRepository,
    @inject(TYPES.IWithdrawalRequestRepository) private _withdrawalRequestRepository: IWithdrawalRequestRepository,
    @inject(TYPES.ITransactionRepository) private _transactionRepository: ITransactionRepository,
    @inject(TYPES.INotificationService) private _notificationService: INotificationService,
    @inject(TYPES.RedisConnector) redisConnector: RedisConnector
  ) {
    this._redisConnector = redisConnector;
    this._quotaRepository = quotaRepository;
  }

  async getAdminTransactions(adminId: string, page: number, limit: number): Promise<{
    transactions: Array<{
      id: string;
      proId: string;
      walletId?: string;
      amount: number;
      type: "credit" | "debit";
      date: Date;
      description?: string;
      bookingId?: string;
      quotaId?: string;
      adminId?: string;
      createdAt: Date;
      updatedAt: Date;
    }>; total: number
  }> {
    return this._transactionRepository.findByAdminIdPaginated(adminId, page, limit);
  }


  async getBookings(page: number, limit: number, search?: string, status?: string, sortBy?: "latest" | "oldest"): Promise<{ bookings: BookingResponse[]; total: number }> {
    const { bookings, total } = await this._bookingRepository.fetchAllBookings(page, limit, search, status, sortBy);
    return { bookings, total };
  }

  async getQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null> {
    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    return quota;
  }

  async getUsers(page: number, limit: number, sortBy?: "latest" | "oldest"): Promise<{ users: UserResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this._userRepository.getUsersWithPagination(skip, limit, sortBy),
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
          createdAt: user.createdAt,
        })
      ),
      total,
    };
  }

  async banUser(userId: string, isBanned: boolean): Promise<UserResponse | null> {
    const updatedUser = await this._userRepository.updateBanStatus(userId, isBanned);
    if (!updatedUser) return null;

    if (isBanned) {
      await this._redisConnector.getClient().del(`refresh:${userId}`);
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

    if (isBanned) {
      await this._redisConnector.getClient().del(`refresh:${proId}`);
    }

    const category = await this._categoryRepository.findCategoryById(updatedPro.categoryId.toString());
    if (!category) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CATEGORY_NOT_FOUND);

    return new ProResponse({
      _id: updatedPro._id.toString(),
      firstName: updatedPro.firstName,
      role: UserRole.PRO,
      lastName: updatedPro.lastName,
      email: updatedPro.email,
      phoneNumber: updatedPro.phoneNumber,
      category: {
        id: category.id,
        name: category.name,
        image: category.image || "",
      },
      customService: updatedPro.customService ?? null,
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
      availability: {
        monday: updatedPro.availability.monday || [],
        tuesday: updatedPro.availability.tuesday || [],
        wednesday: updatedPro.availability.wednesday || [],
        thursday: updatedPro.availability.thursday || [],
        friday: updatedPro.availability.friday || [],
        saturday: updatedPro.availability.saturday || [],
        sunday: updatedPro.availability.sunday || [],
      },
      isBanned: updatedPro.isBanned,
      about: updatedPro.about ?? null,
      isUnavailable: updatedPro.isUnavailable,
    });
  }

  async getPendingPros(page: number, limit: number, sortBy?: "latest" | "oldest"): Promise<{ pros: PendingProResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const pros = await this._proRepository.getPendingProsWithPagination(skip, limit, sortBy);
    const total = await this._proRepository.getTotalPendingProsCount();
    return {
      pros: await Promise.all(
        pros.map(async (doc: PendingProDocument) => {
          const category = await this._categoryRepository.findCategoryById(doc.categoryId.toString());
          if (!category) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CATEGORY_NOT_FOUND);
          return {
            _id: doc._id.toString(),
            firstName: doc.firstName,
            lastName: doc.lastName,
            email: doc.email,
            phoneNumber: doc.phoneNumber,
            category: {
              id: category.id,
              name: category.name,
              image: category.image || "",
            },
            customService: doc.customService,
            location: doc.location,
            profilePhoto: doc.profilePhoto,
            idProof: doc.idProof,
            accountHolderName: doc.accountHolderName,
            accountNumber: doc.accountNumber,
            bankName: doc.bankName,
            availability: doc.availability,
            createdAt: doc.createdAt,
            isRejected: doc.isRejected,
          } as PendingProResponse;
        })
      ),
      total,
    };
  }

  async getPendingProById(id: string): Promise<PendingProResponse> {
    const proDoc = await this._proRepository.findById(id);
    if (!proDoc) {
      throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    }
    const category = await this._categoryRepository.findCategoryById(proDoc.categoryId.toString());
    if (!category) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CATEGORY_NOT_FOUND);
    return {
      _id: proDoc._id.toString(),
      firstName: proDoc.firstName,
      lastName: proDoc.lastName,
      email: proDoc.email,
      phoneNumber: proDoc.phoneNumber,
      category: {
        id: category.id,
        name: category.name,
        image: category.image || "",
      },
      customService: proDoc.customService,
      location: proDoc.location,
      profilePhoto: proDoc.profilePhoto,
      idProof: proDoc.idProof,
      accountHolderName: proDoc.accountHolderName,
      accountNumber: proDoc.accountNumber,
      bankName: proDoc.bankName,
      availability: proDoc.availability,
      createdAt: proDoc.createdAt,
      isRejected: proDoc.isRejected,
    } as PendingProResponse;
  }

  async approvePro(id: string, about: string | null): Promise<void> {
    const { plainPassword, hashedPassword } = await this.generatePassword();
    const { email, firstName, lastName, approvedProId } = await this._proRepository.approvePro(id, hashedPassword, about || "");
    await this.sendApprovalEmail(email, `${firstName} ${lastName}`, plainPassword);

    try {
      await this._notificationService.createNotification({
        type: "general",
        title: "🎉 Welcome to Fixeify Pro!",
        description: `Congratulations ${firstName}! Your professional application has been approved. You can now start receiving bookings and grow your business with Fixeify.`,
        proId: approvedProId
      });
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_PRO_APPROVAL_NOTIFICATION + ":", error);
    }
  }

  async getApprovedPros(page: number, limit: number, sortBy?: "latest" | "oldest"): Promise<{ pros: ProResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [pros, total] = await Promise.all([
      this._proRepository.getApprovedProsWithPagination(skip, limit, sortBy),
      this._proRepository.getTotalApprovedProsCount(),
    ]);
    return { pros, total };
  }

  async getApprovedProById(id: string): Promise<ProResponse> {
    const proDoc = await this._proRepository.findApprovedProByIdAsResponse(id);
    if (!proDoc) {
      throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    }
    return proDoc;
  }

  async createCategory(name: string, image: string): Promise<CategoryResponse> {
    const existingCategory = await this._categoryRepository.findCategoryByName(name);
    if (existingCategory) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.CATEGORY_NAME_EXISTS);
    }
    const categoryData = { name, image };
    return this._categoryRepository.createCategory(categoryData);
  }

  async getCategories(page: number, limit: number): Promise<{ categories: CategoryResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      this._categoryRepository.getCategoriesWithPagination(skip, limit),
      this._categoryRepository.getTotalCategoriesCount(),
    ]);
    return { categories, total };
  }

  async updateCategory(categoryId: string, data: { name?: string; image?: string }): Promise<CategoryResponse | null> {
    if (data.name) {
      const existingCategory = await this._categoryRepository.findCategoryByName(data.name);
      if (existingCategory && existingCategory.id !== categoryId) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.CATEGORY_NAME_EXISTS);
      }
    }
    return this._categoryRepository.updateCategory(categoryId, data);
  }

  async getWithdrawalRequests(
    page: number,
    limit: number,
    sortBy: "latest" | "oldest" = "latest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<{ withdrawals: WithdrawalRequestResponse[]; total: number; pros: ProResponse[] }> {
    const skip = (page - 1) * limit;
    const [withdrawals, total] = await Promise.all([
      this._withdrawalRequestRepository.getAllWithdrawalRequests(skip, limit, sortBy, status),
      this._withdrawalRequestRepository.getTotalWithdrawalRequestsCount(status),
    ]);
    const proIds = [...new Set(withdrawals.map((w) => w.proId))];
    const pros = await Promise.all(proIds.map((id) => this._proRepository.findApprovedProByIdAsResponse(id)));
    return { withdrawals, total, pros: pros.filter((p): p is ProResponse => p !== null) };
  }

  async acceptWithdrawalRequest(withdrawalId: string): Promise<void> {
    const withdrawal = await this._withdrawalRequestRepository.findWithdrawalRequestById(withdrawalId);
    if (!withdrawal) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WITHDRAWAL_NOT_FOUND);
    if (withdrawal.status !== "pending") throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.WITHDRAWAL_NOT_PENDING);

    const wallet = await this._walletRepository.findWalletByProId(withdrawal.proId, false);
    if (!wallet) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WALLET_NOT_FOUND);
    if (wallet.balance < withdrawal.amount) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.INSUFFICIENT_BALANCE);

    await this._walletRepository.decreaseWalletBalance(wallet.id, withdrawal.amount);
    await this._withdrawalRequestRepository.updateWithdrawalRequest(withdrawalId, { status: "approved" });

    // Record a debit transaction in the pro's wallet for this withdrawal approval
    try {
      const mongoose = await import("mongoose");
      await this._transactionRepository.createTransaction({
        proId: new mongoose.Types.ObjectId(withdrawal.proId),
        walletId: new mongoose.Types.ObjectId(wallet.id),
        amount: withdrawal.amount,
        type: "debit",
        date: new Date(),
        description: `Withdrawal approved (Request #${withdrawalId.slice(-6)})`,
      } as any);
    } catch (e) {
      console.error("Failed to record withdrawal debit transaction:", e);
    }

    try {
      await this._notificationService.createNotification({
        type: "wallet",
        title: "Withdrawal Approved",
        description: `Good news! Your withdrawal request of ₹${withdrawal.amount} has been approved and is being processed.`,
        proId: withdrawal.proId,
      });
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_WITHDRAWAL_APPROVAL_NOTIFICATION + ":", error);
    }
  }

  async rejectWithdrawalRequest(withdrawalId: string, reason: string): Promise<void> {
    const withdrawal = await this._withdrawalRequestRepository.findWithdrawalRequestById(withdrawalId);
    if (!withdrawal) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WITHDRAWAL_NOT_FOUND);
    if (withdrawal.status !== "pending") throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.WITHDRAWAL_NOT_PENDING);

    await this._withdrawalRequestRepository.updateWithdrawalRequest(withdrawalId, {
      status: "rejected",
      rejectionReason: reason,
    });

    try {
      await this._notificationService.createNotification({
        type: "wallet",
        title: "Withdrawal Rejected",
        description: `Your withdrawal request of ₹${withdrawal.amount} was rejected. Reason: ${reason || "Not specified"}.`,
        proId: withdrawal.proId,
      });
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_WITHDRAWAL_REJECTION_NOTIFICATION + ":", error);
    }
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
      console.log(MESSAGES.PRO_APPROVED_SUCCESSFULLY);
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_APPROVAL_EMAIL + ":", error);
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.FAILED_SEND_APPROVAL_EMAIL);
    }
  }

  async getTrendingService(): Promise<{ categoryId: string; name: string; bookingCount: number } | null> {
    return await this._bookingRepository.getTrendingService();
  }

  async getDashboardMetrics(adminId: string): Promise<{
    userCount: number;
    proCount: number;
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
    monthlyDeltaPercent: number | null;
    yearlyDeltaPercent: number | null;
    dailyDeltaPercent: number | null;
    categoryCount: number;
    trendingService: { categoryId: string; name: string; bookingCount: number } | null;
    topPerformingPros: {
      mostRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
      highestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
      leastRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
      lowestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
    };
  }> {
    const [userCount, proCount, categoryCount, revenueMetrics, trendingService, topPerformingPros] = await Promise.all([
      this._userRepository.getTotalUsersCount(),
      this._proRepository.getTotalApprovedProsCount(),
      this._categoryRepository.getTotalCategoriesCount(),
      this._bookingRepository.getAdminRevenueMetrics(),
      this._bookingRepository.getTrendingService(),
      this._bookingRepository.getTopPerformingPros(),
    ]);

    return {
      userCount,
      proCount,
      totalRevenue: revenueMetrics.totalRevenue,
      monthlyRevenue: revenueMetrics.monthlyRevenue,
      yearlyRevenue: revenueMetrics.yearlyRevenue,
      dailyRevenue: revenueMetrics.dailyRevenue,
      monthlyDeltaPercent: revenueMetrics.monthlyDeltaPercent ?? null,
      yearlyDeltaPercent: revenueMetrics.yearlyDeltaPercent ?? null,
      dailyDeltaPercent: revenueMetrics.dailyDeltaPercent ?? null,
      categoryCount,
      trendingService,
      topPerformingPros,
    };
  }

  async getMonthlyRevenueSeries(lastNMonths?: number): Promise<Array<{ year: number; month: number; revenue: number }>> {
    return this._bookingRepository.getAdminMonthlyRevenueSeries(lastNMonths);
  }

  async getPlatformProMonthlyRevenueSeries(lastNMonths?: number): Promise<Array<{ year: number; month: number; revenue: number }>> {
    return this._bookingRepository.getPlatformProMonthlyRevenueSeries(lastNMonths);
  }

  async rejectPro(id: string, reason: string): Promise<void> {
    const pendingPro = await this.getPendingProById(id);
    await this._proRepository.rejectPro(id);
    await this.sendRejectionEmail(pendingPro.email, reason, id);
  }

  private async sendRejectionEmail(email: string, reason: string, pendingProId: string): Promise<void> {
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
      html: getRejectionEmailTemplate(reason, pendingProId),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(MESSAGES.PRO_REJECTED_SUCCESSFULLY);
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_REJECTION_EMAIL + ":", error);
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.FAILED_SEND_REJECTION_EMAIL);
    }
  }
}