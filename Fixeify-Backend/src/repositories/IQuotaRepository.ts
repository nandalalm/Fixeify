import type { ClientSession } from "mongoose";
import type { QuotaDocument } from "../models/quotaModel";
import type { PopulatedQuotaRecord } from "../contracts/repository/quotaRecords";

export interface IQuotaRepository {
  createQuota(quotaData: Partial<QuotaDocument>): Promise<PopulatedQuotaRecord>;
  findQuotaByBookingId(bookingId: string, session?: ClientSession): Promise<PopulatedQuotaRecord | null>;
  updateQuota(quotaId: string, data: Partial<QuotaDocument>, session?: ClientSession): Promise<PopulatedQuotaRecord | null>;
  markPaymentCompletedIfPending(quotaId: string, session?: ClientSession): Promise<PopulatedQuotaRecord | null>;
}
