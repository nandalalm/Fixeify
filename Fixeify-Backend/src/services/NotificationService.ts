import { injectable, inject } from "inversify";
import type { INotificationService } from "./INotificationService";
import type { INotificationRepository } from "../repositories/INotificationRepository";
import type { CreateNotificationRequest } from "../dtos/request/notificationDtos";
import type { NotificationResponse } from "../dtos/response/notificationDtos";
import { TYPES } from "../types";
import mongoose from "mongoose";
import { HttpError } from "../middleware/errorMiddleware";
import { HttpStatus } from "../enums/httpStatus";
import { MESSAGES } from "../constants/messages";
import { toNotificationResponse, toNotificationResponses } from "../mappers/notificationMapper";
import type { NotificationListRecord } from "../contracts/repository/notificationRecords";

@injectable()
export class NotificationService implements INotificationService {
  constructor(@inject(TYPES.INotificationRepository) private _notificationRepository: INotificationRepository) { }

  async createNotification(data: CreateNotificationRequest): Promise<NotificationResponse> {
    if (!data.type || !data.title || !data.description) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    }
    const notification = await this._notificationRepository.createNotification(data);
    const response = toNotificationResponse(notification);

    const recipientId = response.userId || response.proId || response.adminId;
    const receiverModel = response.userId ? 'User' : response.proId ? 'ApprovedPro' : 'Admin';
    if (recipientId && (globalThis as Record<string, unknown>).io) {
      const io = (globalThis as Record<string, unknown>).io as {
        to: (socketId: string) => {
          emit: (event: string, data: unknown) => void;
        };
      };
      const connectedUsers = ((globalThis as Record<string, unknown>).connectedUsers || new Map()) as Map<string, { socketId: string }>;
      const user = connectedUsers.get(recipientId);
      if (user) {
        io.to(user.socketId).emit("newNotification", {
          ...response,
          receiverId: recipientId,
          receiverModel
        });
      } 
    }

    return response;
  }

  async getNotifications(
    participantId: string,
    participantModel: "User" | "ApprovedPro" | "Admin",
    page: number,
    limit: number,
    filter: 'all' | 'unread' = 'all'
  ): Promise<{ notifications: NotificationResponse[]; total: number }> {
    if (!participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    let result: NotificationListRecord;
    if (participantModel === "User") {
      result = await this._notificationRepository.findNotificationsByUser(participantId, page, limit, filter);
    } else if (participantModel === "ApprovedPro") {
      result = await this._notificationRepository.findNotificationsByPro(participantId, page, limit, filter);
    } else {
      result = await this._notificationRepository.findNotificationsByAdmin(participantId, page, limit, filter);
    }
    return { notifications: toNotificationResponses(result.notifications), total: result.total };
  }

  async getMessageNotifications(
    participantId: string,
    participantModel: "User" | "ApprovedPro" | "Admin",
    page: number,
    limit: number,
    filter: 'all' | 'unread' = 'all'
  ): Promise<{ notifications: NotificationResponse[]; total: number }> {
    if (!participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    let result: NotificationListRecord;
    if (participantModel === "User") {
      result = await this._notificationRepository.findMessageNotificationsByUser(participantId, page, limit, filter);
    } else if (participantModel === "ApprovedPro") {
      result = await this._notificationRepository.findMessageNotificationsByPro(participantId, page, limit, filter);
    } else {
      result = await this._notificationRepository.findMessageNotificationsByAdmin(participantId, page, limit, filter);
    }
    return { notifications: toNotificationResponses(result.notifications), total: result.total };
  }

  async getNonMessageNotifications(
    participantId: string,
    participantModel: "User" | "ApprovedPro" | "Admin",
    page: number,
    limit: number,
    filter: 'all' | 'unread' = 'all'
  ): Promise<{ notifications: NotificationResponse[]; total: number }> {
    if (!participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    let result: NotificationListRecord;
    if (participantModel === "User") {
      result = await this._notificationRepository.findNonMessageNotificationsByUser(participantId, page, limit, filter);
    } else if (participantModel === "ApprovedPro") {
      result = await this._notificationRepository.findNonMessageNotificationsByPro(participantId, page, limit, filter);
    } else {
      result = await this._notificationRepository.findNonMessageNotificationsByAdmin(participantId, page, limit, filter);
    }
    return { notifications: toNotificationResponses(result.notifications), total: result.total };
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    if (!notificationId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.NOTIFICATIONID_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    await this._notificationRepository.markNotificationAsRead(notificationId);
  }

  async markAllNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void> {
    if (!participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    await this._notificationRepository.markAllNotificationsAsRead(participantId, participantModel);
  }

  async markAllMessageNotificationsAsRead(participantId: string, participantModel: "User" | "ApprovedPro" | "Admin"): Promise<void> {
    if (!participantId) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALL_FIELDS_REQUIRED);
    if (!mongoose.Types.ObjectId.isValid(participantId)) throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.SERVER_ERROR);
    await this._notificationRepository.markAllMessageNotificationsAsRead(participantId, participantModel);
  }
}
