import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import logger from "../config/logger";
import type { IUserRepository } from "../repositories/IUserRepository";
import type { IProRepository } from "../repositories/IProRepository";
import type { ICategoryRepository } from "../repositories/ICategoryRepository";
import type { IBookingRepository } from "../repositories/IBookingRepository";
import type { IQuotaRepository } from "../repositories/IQuotaRepository";
import type { IWalletRepository } from "../repositories/IWalletRepository";
import type { IWithdrawalRequestRepository } from "../repositories/IWithdrawalRequestRepository";
import type { ITransactionRepository } from "../repositories/ITransactionRepository";
import type { UserResponse } from "../dtos/response/userDtos";
import type { IAdminService } from "./IAdminService";
import type { ProResponse, PendingProResponse } from "../dtos/response/proDtos";
import type { CategoryResponse } from "../dtos/response/categoryDtos";
import type { BookingResponse } from "../dtos/response/bookingDtos";
import type { QuotaResponse } from "../dtos/response/quotaDtos";
import type { WithdrawalResponse } from "../dtos/response/withdrawalDtos";
import type { TransactionResponse } from "../dtos/response/transactionDtos";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { getApprovalEmailTemplate, getRejectionEmailTemplate } from "../utils/emailTemplates";
import RedisConnector from "../config/redisConnector";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { HttpStatus } from "../enums/httpStatus";
import type { INotificationService } from "./INotificationService";
import mongoose from "mongoose";
import { toAdminUserListResponse, toUserResponse } from "../mappers/userMapper";
import { toCategoryResponse, toCategoryResponses } from "../mappers/categoryMapper";
import { toPendingProResponse, toPopulatedProResponse, toProResponse } from "../mappers/proMapper";
import { toBookingResponse } from "../mappers/bookingMapper";
import { toQuotaResponse } from "../mappers/quotaMapper";
import { toTransactionResponse } from "../mappers/transactionMapper";
import { toWithdrawalResponses } from "../mappers/withdrawalMapper";

declare const process: {
  env: {
    FRONTEND_URL: string;
    EMAIL_USER: string;
    EMAIL_PASS: string;
    [key: string]: string | undefined;
  };
};

@injectable()
export class AdminService implements IAdminService {
  private _redisConnector: RedisConnector;
  private _quotaRepository: IQuotaRepository;

  constructor(
    @inject(TYPES.IUserRepository) private _userRepository: IUserRepository,
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

  async getAdminTransactions(adminId: string, page: number, limit: number): Promise<{ transactions: TransactionResponse[]; total: number }> {
    const { transactions, total } = await this._transactionRepository.findByAdminIdPaginated(adminId, page, limit);
    return { transactions: transactions.map(toTransactionResponse), total };
  }


  async getBookings(page: number, limit: number, search?: string, status?: string, sortBy?: "latest" | "oldest", bookingId?: string): Promise<{ bookings: BookingResponse[]; total: number }> {
    const { bookings, total } = await this._bookingRepository.fetchAllBookings(page, limit, search, status, sortBy, bookingId);
    return { bookings: bookings.map(toBookingResponse), total };
  }

  async getQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null> {
    const quota = await this._quotaRepository.findQuotaByBookingId(bookingId);
    return quota ? toQuotaResponse(quota) : null;
  }

  async getUsers(page: number, limit: number, sortBy?: "latest" | "oldest"): Promise<{ users: UserResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this._userRepository.getUsersWithPagination(skip, limit, sortBy),
      this._userRepository.getTotalUsersCount(),
    ]);
    return {
      users: users.map(toAdminUserListResponse),
      total,
    };
  }

  async banUser(userId: string, isBanned: boolean): Promise<UserResponse | null> {
    const updatedUser = await this._userRepository.updateBanStatus(userId, isBanned);
    if (!updatedUser) return null;

    if (isBanned) {
      await this._redisConnector.getClient().del(`refresh:${userId}`);
      try {
        await this._notificationService.createNotification({
          type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
          title: MESSAGES.NOTIFICATION_TITLE_ACCOUNT_BANNED,
          description: MESSAGES.NOTIFICATION_DESC_USER_ACCOUNT_BANNED,
          userId: userId,
        });
      } catch (error) {
        logger.error(MESSAGES.FAILED_CREATE_BAN_NOTIFICATION_USER, { userId, error });
      }
    } else {
      try {
        await this._notificationService.createNotification({
          type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
          title: MESSAGES.NOTIFICATION_TITLE_ACCOUNT_UNBANNED,
          description: MESSAGES.NOTIFICATION_DESC_USER_ACCOUNT_UNBANNED,
          userId: userId,
        });
      } catch (error) {
        logger.error(MESSAGES.FAILED_CREATE_UNBAN_NOTIFICATION_USER, { userId, error });
      }
    }

    return toUserResponse(updatedUser);
  }

  async banPro(proId: string, isBanned: boolean): Promise<ProResponse | null> {
    const updatedPro = await this._proRepository.updateBanStatus(proId, isBanned);
    if (!updatedPro) return null;

    if (isBanned) {
      await this._redisConnector.getClient().del(`refresh:${proId}`);
      try {
        await this._notificationService.createNotification({
          type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
          title: MESSAGES.NOTIFICATION_TITLE_ACCOUNT_BANNED,
          description: MESSAGES.NOTIFICATION_DESC_PRO_ACCOUNT_BANNED,
          proId: proId,
        });
      } catch (error) {
        logger.error(MESSAGES.FAILED_CREATE_BAN_NOTIFICATION_PRO, { proId, error });
      }
    } else {
      try {
        await this._notificationService.createNotification({
          type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
          title: MESSAGES.NOTIFICATION_TITLE_ACCOUNT_UNBANNED,
          description: MESSAGES.NOTIFICATION_DESC_PRO_ACCOUNT_UNBANNED,
          proId: proId,
        });
      } catch (error) {
        logger.error(MESSAGES.FAILED_CREATE_UNBAN_NOTIFICATION_PRO, { proId, error });
      }
    }

    const category = await this._categoryRepository.findCategoryById(updatedPro.categoryId.toString());
    if (!category) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CATEGORY_NOT_FOUND);

    return toProResponse(updatedPro, category);
  }

  async getPendingPros(page: number, limit: number, sortBy?: "latest" | "oldest"): Promise<{ pros: PendingProResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const pros = await this._proRepository.getPendingProsWithPagination(skip, limit, sortBy);
    const total = await this._proRepository.getTotalPendingProsCount();
    return {
      pros: await Promise.all(
        pros.map(async (doc) => {
          const category = await this._categoryRepository.findCategoryById(doc.categoryId.toString());
          if (!category) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.CATEGORY_NOT_FOUND);
          return toPendingProResponse(doc, category);
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
    return toPendingProResponse(proDoc, category);
  }

  async approvePro(id: string, about: string | null): Promise<void> {
    const { plainPassword, hashedPassword } = await this.generatePassword();
    const session = await mongoose.startSession();
    let approvedPro: { email: string; firstName: string; lastName: string; approvedProId: string } | null = null;
    try {
      session.startTransaction();
      approvedPro = await this._proRepository.approvePro(id, hashedPassword, about || "", session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    if (!approvedPro) {
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.SERVER_ERROR);
    }

    const { email, firstName, lastName, approvedProId } = approvedPro;
    await this.sendApprovalEmail(email, `${firstName} ${lastName}`, plainPassword);

    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_GENERAL,
        title: MESSAGES.NOTIFICATION_TITLE_WELCOME_FIXEIFY_PRO,
        description: `${MESSAGES.NOTIFICATION_DESC_PRO_APPROVED_PREFIX} ${firstName}! ${MESSAGES.NOTIFICATION_DESC_PRO_APPROVED_SUFFIX}`,
        proId: approvedProId
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_APPROVAL_NOTIFICATION_PRO, { proId: approvedProId, firstName, error });
    }
  }

  async getApprovedPros(page: number, limit: number, sortBy?: "latest" | "oldest"): Promise<{ pros: ProResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [pros, total] = await Promise.all([
      this._proRepository.getApprovedProsWithPagination(skip, limit, sortBy),
      this._proRepository.getTotalApprovedProsCount(),
    ]);
    return { pros: pros.map(toPopulatedProResponse), total };
  }

  async getApprovedProById(id: string): Promise<ProResponse> {
    const proDoc = await this._proRepository.findApprovedProByIdWithCategory(id);
    if (!proDoc) {
      throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.PRO_NOT_FOUND);
    }
    return toPopulatedProResponse(proDoc);
  }

  async createCategory(name: string, image: string): Promise<CategoryResponse> {
    const existingCategory = await this._categoryRepository.findCategoryByName(name);
    if (existingCategory) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.CATEGORY_NAME_EXISTS);
    }
    const categoryData = { name, image };
    const category = await this._categoryRepository.createCategory(categoryData);
    return toCategoryResponse(category);
  }

  async getCategories(page: number, limit: number): Promise<{ categories: CategoryResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      this._categoryRepository.getCategoriesWithPagination(skip, limit),
      this._categoryRepository.getTotalCategoriesCount(),
    ]);
    return { categories: toCategoryResponses(categories), total };
  }

  async updateCategory(categoryId: string, data: { name?: string; image?: string }): Promise<CategoryResponse | null> {
    if (data.name) {
      const existingCategory = await this._categoryRepository.findCategoryByName(data.name);
      if (existingCategory && existingCategory.id !== categoryId) {
        throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.CATEGORY_NAME_EXISTS);
      }
    }
    const updatedCategory = await this._categoryRepository.updateCategory(categoryId, data);
    return updatedCategory ? toCategoryResponse(updatedCategory) : null;
  }

  async getWithdrawalRequests(
    page: number,
    limit: number,
    sortBy: "latest" | "oldest" = "latest",
    status?: "pending" | "approved" | "rejected"
  ): Promise<{ withdrawals: WithdrawalResponse[]; total: number; pros: ProResponse[] }> {
    const skip = (page - 1) * limit;
    const [withdrawals, total] = await Promise.all([
      this._withdrawalRequestRepository.getAllWithdrawalRequests(skip, limit, sortBy, status),
      this._withdrawalRequestRepository.getTotalWithdrawalRequestsCount(status),
    ]);
    const proIds = [...new Set(withdrawals.map((w) => w.proId.toString()))];
    const pros = await Promise.all(proIds.map((id) => this._proRepository.findApprovedProByIdWithCategory(id)));
    return {
      withdrawals: toWithdrawalResponses(withdrawals),
      total,
      pros: pros
        .filter((pro): pro is NonNullable<typeof pro> => pro !== null)
        .map(toPopulatedProResponse),
    };
  }

  async acceptWithdrawalRequest(withdrawalId: string): Promise<void> {
    const session = await mongoose.startSession();
    let approvedWithdrawal: { proId: string; amount: number } | null = null;
    try {
      session.startTransaction();
      const withdrawal = await this._withdrawalRequestRepository.findWithdrawalRequestById(withdrawalId, session);
      if (!withdrawal) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WITHDRAWAL_NOT_FOUND);
      if (withdrawal.status !== "pending") throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.WITHDRAWAL_NOT_PENDING);

      const withdrawalProId = withdrawal.proId.toString();
      const wallet = await this._walletRepository.findWalletByProId(withdrawalProId, false, session);
      if (!wallet) throw new HttpError(HttpStatus.NOT_FOUND, MESSAGES.WALLET_NOT_FOUND);
      if (wallet.balance < withdrawal.amount) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.INSUFFICIENT_BALANCE);

      await this._walletRepository.decreaseWalletBalance(wallet._id.toString(), withdrawal.amount, session);
      await this._withdrawalRequestRepository.updateWithdrawalRequest(withdrawalId, { status: "approved" }, session);

      try {
        await this._transactionRepository.createTransaction({
          proId: new mongoose.Types.ObjectId(withdrawal.proId),
          walletId: new mongoose.Types.ObjectId(wallet._id),
          amount: withdrawal.amount,
          type: "debit",
          date: new Date(),
          description: `${MESSAGES.TRANSACTION_DESC_WITHDRAWAL_APPROVED_PREFIX}${withdrawalId.slice(-6)})`,
        }, session);
      } catch (error) {
        logger.error(MESSAGES.FAILED_CREATE_TRANSACTION_WITHDRAWAL_APPROVAL, { withdrawalId, proId: withdrawalProId, amount: withdrawal.amount, error });
        throw error;
      }

      approvedWithdrawal = { proId: withdrawalProId, amount: withdrawal.amount };
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    if (!approvedWithdrawal) {
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.SERVER_ERROR);
    }

    try {
      await this._notificationService.createNotification({
        type: MESSAGES.NOTIFICATION_TYPE_WALLET,
        title: MESSAGES.NOTIFICATION_TITLE_WITHDRAWAL_APPROVED,
        description: `${MESSAGES.NOTIFICATION_DESC_WITHDRAWAL_APPROVED_PREFIX} ${MESSAGES.CURRENCY_INR}${approvedWithdrawal.amount} ${MESSAGES.NOTIFICATION_DESC_WITHDRAWAL_APPROVED_SUFFIX}`,
        proId: approvedWithdrawal.proId,
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_WITHDRAWAL_APPROVAL_NOTIFICATION, { withdrawalId, proId: approvedWithdrawal.proId, amount: approvedWithdrawal.amount, error });
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
        type: MESSAGES.NOTIFICATION_TYPE_WALLET,
        title: MESSAGES.NOTIFICATION_TITLE_WITHDRAWAL_REJECTED,
        description: `${MESSAGES.NOTIFICATION_DESC_WITHDRAWAL_REJECTED_PREFIX} ${MESSAGES.CURRENCY_INR}${withdrawal.amount} ${MESSAGES.NOTIFICATION_DESC_WITHDRAWAL_REJECTED_REASON_PREFIX} ${reason || MESSAGES.NOTIFICATION_DESC_NOT_SPECIFIED}.`,
        proId: withdrawal.proId.toString(),
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_CREATE_WITHDRAWAL_REJECTION_NOTIFICATION, { withdrawalId, proId: withdrawal.proId.toString(), amount: withdrawal.amount, reason, error });
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
      subject: MESSAGES.EMAIL_SUBJECT_APPROVED_FOR_DUTY,
      html: getApprovalEmailTemplate(email, name, password),
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      logger.error(MESSAGES.FAILED_SEND_APPROVAL_EMAIL_LOG, { email, name, error });
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.FAILED_SEND_APPROVAL_EMAIL);
    }
  }

  async getTrendingService(): Promise<{ categoryId: string; name: string; bookingCount: number } | null> {
    return await this._bookingRepository.getTrendingService();
  }

  async getDashboardMetrics(): Promise<{
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
      subject: MESSAGES.EMAIL_SUBJECT_REQUEST_REJECTED,
      html: getRejectionEmailTemplate(reason, pendingProId),
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      logger.error(MESSAGES.FAILED_SEND_REJECTION_EMAIL_LOG, { email, reason, pendingProId, error });
      throw new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, MESSAGES.FAILED_SEND_REJECTION_EMAIL);
    }
  }
}

