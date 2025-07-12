import { QuotaDocument } from "../models/quotaModel";
import { QuotaResponse } from "../dtos/response/quotaDtos";

export interface IQuotaRepository {
  createQuota(quotaData: Partial<QuotaDocument>): Promise<QuotaResponse>;
  findQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null>;
  updateQuota(quotaId: string, data: Partial<QuotaDocument>): Promise<QuotaResponse | null>;
}