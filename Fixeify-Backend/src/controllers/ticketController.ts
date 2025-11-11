import { Request, Response, NextFunction } from "express";
import { ITicketService } from "../services/ITicketService";
import { CreateTicketRequest, UpdateTicketStatusRequest } from "../dtos/request/ticketDtos";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";
import logger from "../config/logger";

@injectable()
export class TicketController {
  constructor(@inject(TYPES.ITicketService) private _ticketService: ITicketService) { }

  createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as CreateTicketRequest;
      const ticket = await this._ticketService.createTicket(body);
      res.status(HttpStatus.CREATED).json({ success: true, message: MESSAGES.COMPLAINT_SUBMITTED_SUCCESS, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const ticket = await this._ticketService.getTicketById(id);
      if (!ticket) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: MESSAGES.TICKET_NOT_FOUND
        });
        return;
      }
      res.status(HttpStatus.OK).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  };

  getTicketByTicketId = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { ticketId } = req.params;
      const ticket = await this._ticketService.getTicketByTicketId(ticketId);

      if (!ticket) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: MESSAGES.TICKET_NOT_FOUND
        });
        return;
      }
      res.status(HttpStatus.OK).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      logger.error(MESSAGES.FAILED_TO_FETCH_TICKET, error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: MESSAGES.FAILED_TO_FETCH_TICKET
      });
    }
  };

  getTicketsByComplainant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { complainantId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await this._ticketService.getTicketsByComplainant(complainantId, page, limit);
      res.status(HttpStatus.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };


  getTicketsAgainst = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { againstId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await this._ticketService.getTicketsByAgainst(againstId, page, limit);
      res.status(HttpStatus.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };


  getAllTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const result = await this._ticketService.getAllTickets(page, limit, status);
      res.status(HttpStatus.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };


  updateTicketStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const body = req.body as UpdateTicketStatusRequest;
      const ticket = await this._ticketService.updateTicketStatus(id, body);

      if (!ticket) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: MESSAGES.TICKET_NOT_FOUND
        });
        return;
      }
      res.status(HttpStatus.OK).json({
        success: true,
        message: MESSAGES.TICKET_STATUS_UPDATED_SUCCESS,
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  };

  updateTicketBanStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { isUserBanned, isProBanned } = req.body;
      const ticket = await this._ticketService.updateTicketBanStatus(id, isUserBanned, isProBanned);

      if (!ticket) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: MESSAGES.TICKET_NOT_FOUND
        });
        return;
      }
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Ban status updated successfully",
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  };

  getTicketStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this._ticketService.getTicketStats();
      res.status(HttpStatus.OK).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };
}
