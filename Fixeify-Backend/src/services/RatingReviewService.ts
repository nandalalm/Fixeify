import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import { IRatingReviewRepository } from "../repositories/IRatingReviewRepository";
import { IRatingReviewService } from "./IRatingReviewService";
import { CreateRatingReviewRequest } from "../dtos/request/ratingReviewDtos";
import { RatingReviewResponse } from "../dtos/response/ratingReviewDtos";
import { HttpError } from "../middleware/errorMiddleware";

@injectable()
export class RatingReviewService implements IRatingReviewService {
  constructor(
    @inject(TYPES.IRatingReviewRepository)
    private _ratingReviewRepository: IRatingReviewRepository
  ) {}

  async createRatingReview(
    data: CreateRatingReviewRequest
  ): Promise<RatingReviewResponse> {
    if (data.rating < 1 || data.rating > 5) {
      throw new HttpError(400, "Rating must be between 1 and 5");
    }

    const alreadyReviewed = await this._ratingReviewRepository.hasUserReviewedBookingOrQuota(
      data.userId,
      data.bookingId,
      data.quotaId
    );
    if (alreadyReviewed) {
      throw new HttpError(400, "You have already reviewed this booking or quota");
    }

    const saved = await this._ratingReviewRepository.create({
      userId: data.userId as any,
      proId: data.proId as any,
      categoryId: data.categoryId as any,
      bookingId: data.bookingId as any,
      quotaId: data.quotaId as any,
      rating: data.rating,
      review: data.review,
    });

    if (data.bookingId) {
      const bookingRepo = require("../repositories/BookingRepository");
      const repoInstance = new bookingRepo.MongoBookingRepository();
      await repoInstance.updateBooking(data.bookingId, { isRated: true });
    }

    return new RatingReviewResponse(saved as any);
  }

  async getRatingReviewsByPro(
    proId: string,
    page: number = 1,
    limit: number = 5
  ): Promise<{
    items: RatingReviewResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { items, total } = await this._ratingReviewRepository.findByProId(
      proId,
      page,
      limit
    );

    return {
      items: items.map((doc) => new RatingReviewResponse(doc as any)),
      total,
      page,
      limit,
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
    const { items, total } = await this._ratingReviewRepository.findByUserId(
      userId,
      page,
      limit
    );
    return {
      items: items.map((doc) => new RatingReviewResponse(doc as any)),
      total,
      page,
      limit,
    };
  }

  async getAllRatingReviews(
    page: number = 1,
    limit: number = 5
  ): Promise<{ items: RatingReviewResponse[]; total: number; page: number; limit: number }> {
    const { items, total } = await this._ratingReviewRepository.findAll(page, limit);
    return {
      items: items.map((doc) => new RatingReviewResponse(doc as any)),
      total,
      page,
      limit,
    };
  }

  async getRatingReviewById(id: string): Promise<RatingReviewResponse | null> {
    const doc = await this._ratingReviewRepository.findById(id);
    return doc ? new RatingReviewResponse(doc as any) : null;
  }
}
