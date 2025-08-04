import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { INotification, Notification } from "../models/notificationModel";
import { INotificationRepository } from "./INotificationRepository";
import { NotificationResponse } from "../dtos/response/notificationDtos";
import mongoose from "mongoose";

@injectable()
export class MongoNotificationRepository extends BaseRepository<INotification> implements INotificationRepository {
  constructor() {
    super(Notification);
  }

  async createNotification(data: {
    type: "message" | "booking" | "quota" | "wallet" | "general";
    title: string;
    description: string;
    userId?: string;
    proId?: string;
    chatId?: string;
    bookingId?: string;
    quotaId?: string;
    walletId?: string;
    messageId?: string;
  }): Promise<INotification> {
    if (!data.type || !data.title || !data.description) {
      throw new Error("type, title, and description are required");
    }
    return this.create({
      ...data,
      userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : undefined,
      proId: data.proId ? new mongoose.Types.ObjectId(data.proId) : undefined,
      chatId: data.chatId ? new mongoose.Types.ObjectId(data.chatId) : undefined,
      bookingId: data.bookingId ? new mongoose.Types.ObjectId(data.bookingId) : undefined,
      quotaId: data.quotaId ? new mongoose.Types.ObjectId(data.quotaId) : undefined,
      walletId: data.walletId ? new mongoose.Types.ObjectId(data.walletId) : undefined,
      messageId: data.messageId ? new mongoose.Types.ObjectId(data.messageId) : undefined,
    });
  }

  async findNotificationsByUser(userId: string, page: number, limit: number): Promise<{ notifications: NotificationResponse[]; total: number }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }
    const skip = (page - 1) * limit;
    const notifications = await this._model
      .find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this._model.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });

    return {
      notifications: notifications.map((n) => this.mapToNotificationResponse(n)),
      total,
    };
  }

  async findNotificationsByPro(proId: string, page: number, limit: number): Promise<{ notifications: NotificationResponse[]; total: number }> {
    if (!mongoose.Types.ObjectId.isValid(proId)) {
      throw new Error("Invalid proId");
    }
    const skip = (page - 1) * limit;
    const notifications = await this._model
      .find({ proId: new mongoose.Types.ObjectId(proId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this._model.countDocuments({ proId: new mongoose.Types.ObjectId(proId) });

    return {
      notifications: notifications.map((n) => this.mapToNotificationResponse(n)),
      total,
    };
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new Error("Invalid notificationId");
    }
    await this.updateById(notificationId, { isRead: true });
  }

  async markAllNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro"): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      throw new Error("Invalid participantId");
    }
    const filter = participantModel === "User"
      ? { userId: new mongoose.Types.ObjectId(participantId), isRead: false }
      : { proId: new mongoose.Types.ObjectId(participantId), isRead: false };
    await this._model.updateMany(filter, { isRead: true }).exec();
  }

  private mapToNotificationResponse(notification: INotification): NotificationResponse {
    return {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      description: notification.description,
      userId: notification.userId?.toString(),
      proId: notification.proId?.toString(),
      chatId: notification.chatId?.toString(),
      bookingId: notification.bookingId?.toString(),
      quotaId: notification.quotaId?.toString(),
      walletId: notification.walletId?.toString(),
      messageId: notification.messageId?.toString(),
      isRead: notification.isRead,
      timestamp: notification.createdAt.toISOString(),
    };
  }
}