import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import { IRatingReviewService } from "../services/IRatingReviewService";
import { CreateRatingReviewRequest } from "../dtos/request/ratingReviewDtos";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";

@injectable()
export class RatingReviewController {
  constructor(
    @inject(TYPES.IRatingReviewService)
    private _ratingReviewService: IRatingReviewService
  ) { }

  createRatingReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as CreateRatingReviewRequest;
      const result = await this._ratingReviewService.createRatingReview(body);
      res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };

  getRatingReviewsByPro = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { proId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const sortBy = (req.query.sortBy as "latest" | "oldest" | "lowest" | "highest") || undefined;
      const search = (req.query.search as string) || undefined;
      const result = await this._ratingReviewService.getRatingReviewsByPro(proId, page, limit, sortBy, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getRatingReviewsByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const result = await this._ratingReviewService.getRatingReviewsByUser(userId, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getAllRatingReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const sortBy = (req.query.sortBy as "latest" | "oldest" | "lowest" | "highest") || undefined;
      const search = (req.query.search as string) || undefined;
      const result = await this._ratingReviewService.getAllRatingReviews(page, limit, sortBy, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getRatingReviewById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this._ratingReviewService.getRatingReviewById(id);
      if (!result) return res.status(HttpStatus.NOT_FOUND).json({ message: MESSAGES.NOT_FOUND });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
