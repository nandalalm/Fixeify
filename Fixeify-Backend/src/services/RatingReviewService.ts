import { inject, injectable } from "inversify";
import mongoose from "mongoose";
import { TYPES } from "../types";
import type { IRatingReviewRepository } from "../repositories/IRatingReviewRepository";
import type { IBookingRepository } from "../repositories/IBookingRepository";
import type { IRatingReviewService } from "./IRatingReviewService";
import type { CreateRatingReviewRequest } from "../dtos/request/ratingReviewDtos";
import type { RatingReviewResponse } from "../dtos/response/ratingReviewDtos";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";
import { toRatingReviewResponse, toRatingReviewResponses } from "../mappers/ratingReviewMapper";

@injectable()
export class RatingReviewService implements IRatingReviewService {
  constructor(
    @inject(TYPES.IRatingReviewRepository)
    private _ratingReviewRepository: IRatingReviewRepository,
    @inject(TYPES.IBookingRepository)
    private _bookingRepository: IBookingRepository
  ) { }

  async createRatingReview(
    data: CreateRatingReviewRequest
  ): Promise<RatingReviewResponse> {
    if (data.rating < 1 || data.rating > 5) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.RATING_BETWEEN_1_5);
    }

    const alreadyReviewed = await this._ratingReviewRepository.hasUserReviewedBookingOrQuota(
      data.userId,
      data.bookingId,
      data.quotaId
    );
    if (alreadyReviewed) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.ALREADY_REVIEWED);
    }

    const saved = await this._ratingReviewRepository.createRatingReview({
      userId: new mongoose.Types.ObjectId(data.userId),
      proId: new mongoose.Types.ObjectId(data.proId),
      categoryId: new mongoose.Types.ObjectId(data.categoryId),
      bookingId: data.bookingId ? new mongoose.Types.ObjectId(data.bookingId) : undefined,
      quotaId: data.quotaId ? new mongoose.Types.ObjectId(data.quotaId) : undefined,
      rating: data.rating,
      review: data.review,
    });

    if (data.bookingId) {
      await this._bookingRepository.updateBooking(data.bookingId, { isRated: true });
    }

    return toRatingReviewResponse(saved);
  }

  async getRatingReviewsByPro(
    proId: string,
    page: number = 1,
    limit: number = 5,
    sortBy?: "latest" | "oldest" | "lowest" | "highest",
    search?: string
  ): Promise<{
    items: RatingReviewResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { items, total } = await this._ratingReviewRepository.findByProId(proId, page, limit, sortBy, search);

    return {
      items: toRatingReviewResponses(items),
      total, page, limit,
    };
  }

  async getRatingReviewsByUser(
    userId: string,
    page: number = 1,
    limit: number = 5
  ): Promise<{
    items: RatingReviewResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { items, total } = await this._ratingReviewRepository.findByUserId(userId, page, limit);
    return {
      items: toRatingReviewResponses(items),
      total, page, limit,
    };
  }

  async getAllRatingReviews(
    page: number = 1,
    limit: number = 5,
    sortBy?: "latest" | "oldest" | "lowest" | "highest",
    search?: string
  ): Promise<{ items: RatingReviewResponse[]; total: number; page: number; limit: number }> {
    const { items, total } = await this._ratingReviewRepository.findAll(page, limit, sortBy, search);
    return {
      items: toRatingReviewResponses(items),
      total, page, limit,
    };
  }

  async getRatingReviewById(id: string): Promise<RatingReviewResponse | null> {
    const doc = await this._ratingReviewRepository.findById(id);
    return doc ? toRatingReviewResponse(doc) : null;
  }
}
