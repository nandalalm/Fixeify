import { injectable } from "inversify";
import { BaseRepository } from "./baseRepository";
import { type INotification, Notification } from "../models/notificationModel";
import type { INotificationRepository } from "./INotificationRepository";
import mongoose, { type FilterQuery } from "mongoose";
import { MESSAGES } from "../constants/messages";
import type { CreateNotificationData, NotificationFilter, NotificationListRecord, NotificationType } from "../contracts/repository/notificationRecords";

@injectable()
export class MongoNotificationRepository extends BaseRepository<INotification> implements INotificationRepository {
  constructor() {
    super(Notification);
  }

  async createNotification(data: CreateNotificationData): Promise<INotification> {
    if (!data.type || !data.title || !data.description) {
      throw new Error(MESSAGES.ALL_FIELDS_REQUIRED);
    }
    return this.create({
      ...data,
      userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : undefined,
      proId: data.proId ? new mongoose.Types.ObjectId(data.proId) : undefined,
      adminId: data.adminId ? new mongoose.Types.ObjectId(data.adminId) : undefined,
      chatId: data.chatId ? new mongoose.Types.ObjectId(data.chatId) : undefined,
      bookingId: data.bookingId ? new mongoose.Types.ObjectId(data.bookingId) : undefined,
      quotaId: data.quotaId ? new mongoose.Types.ObjectId(data.quotaId) : undefined,
      walletId: data.walletId ? new mongoose.Types.ObjectId(data.walletId) : undefined,
      messageId: data.messageId ? new mongoose.Types.ObjectId(data.messageId) : undefined,
    });
  }

  async findNotificationsByUser(userId: string, page: number, limit: number, filter: NotificationFilter = "all"): Promise<NotificationListRecord> {
    return this.findNotificationsByParticipant("userId", userId, page, limit, filter);
  }

  async findNotificationsByPro(proId: string, page: number, limit: number, filter: NotificationFilter = "all"): Promise<NotificationListRecord> {
    return this.findNotificationsByParticipant("proId", proId, page, limit, filter);
  }

  async findNotificationsByAdmin(adminId: string, page: number, limit: number, filter: NotificationFilter = "all"): Promise<NotificationListRecord> {
    return this.findNotificationsByParticipant("adminId", adminId, page, limit, filter);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new Error(MESSAGES.NOTIFICATIONID_REQUIRED);
    }
    await this.updateById(notificationId, { isRead: true });
  }

  async markAllNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void> {
    await this.markNotificationsAsRead(participantId, participantModel);
  }

  async findMessageNotificationsByUser(userId: string, page: number, limit: number, filter: NotificationFilter = "all"): Promise<NotificationListRecord> {
    return this.findNotificationsByParticipant("userId", userId, page, limit, filter, "message");
  }

  async findMessageNotificationsByPro(proId: string, page: number, limit: number, filter: NotificationFilter = "all"): Promise<NotificationListRecord> {
    return this.findNotificationsByParticipant("proId", proId, page, limit, filter, "message");
  }

  async findMessageNotificationsByAdmin(adminId: string, page: number, limit: number, filter: NotificationFilter = "all"): Promise<NotificationListRecord> {
    return this.findNotificationsByParticipant("adminId", adminId, page, limit, filter, "message");
  }

  async findNonMessageNotificationsByUser(userId: string, page: number, limit: number, filter: NotificationFilter = "all"): Promise<NotificationListRecord> {
    return this.findNotificationsByParticipant("userId", userId, page, limit, filter, undefined, true);
  }

  async findNonMessageNotificationsByPro(proId: string, page: number, limit: number, filter: NotificationFilter = "all"): Promise<NotificationListRecord> {
    return this.findNotificationsByParticipant("proId", proId, page, limit, filter, undefined, true);
  }

  async findNonMessageNotificationsByAdmin(adminId: string, page: number, limit: number, filter: NotificationFilter = "all"): Promise<NotificationListRecord> {
    return this.findNotificationsByParticipant("adminId", adminId, page, limit, filter, undefined, true);
  }

  async markAllMessageNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void> {
    await this.markNotificationsAsRead(participantId, participantModel, "message");
  }

  private async findNotificationsByParticipant(
    participantField: "userId" | "proId" | "adminId",
    participantId: string,
    page: number,
    limit: number,
    filter: NotificationFilter,
    type?: NotificationType,
    excludeMessages: boolean = false
  ): Promise<NotificationListRecord> {
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      throw new Error(MESSAGES.ALL_FIELDS_REQUIRED);
    }

    const skip = (page - 1) * limit;
    const query: FilterQuery<INotification> = {
      [participantField]: new mongoose.Types.ObjectId(participantId),
    };

    if (filter === "unread") {
      query.isRead = false;
    }
    if (type) {
      query.type = type;
    }
    if (excludeMessages) {
      query.type = { $ne: "message" };
    }

    const [notifications, total] = await Promise.all([
      this._model
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this._model.countDocuments(query),
    ]);

    return { notifications, total };
  }

  private async markNotificationsAsRead(
    participantId: string,
    participantModel: "User" | "ApprovedPro" | "Admin",
    type?: NotificationType
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      throw new Error(MESSAGES.ALL_FIELDS_REQUIRED);
    }

    const participantObjectId = new mongoose.Types.ObjectId(participantId);
    const filter: FilterQuery<INotification> = {
      isRead: false,
      ...(type ? { type } : {}),
    };

    if (participantModel === "User") {
      filter.userId = participantObjectId;
    } else if (participantModel === "ApprovedPro") {
      filter.proId = participantObjectId;
    } else {
      filter.adminId = participantObjectId;
    }

    await this._model.updateMany(filter, { isRead: true }).exec();
  }
}
