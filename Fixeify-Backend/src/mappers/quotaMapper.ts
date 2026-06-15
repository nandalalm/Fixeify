import type { QuotaResponse } from "../dtos/response/quotaDtos";
import type { PopulatedQuotaRecord } from "../contracts/repository/quotaRecords";

export const toQuotaResponse = (quota: PopulatedQuotaRecord): QuotaResponse => ({
  id: quota._id.toString(),
  user: {
    id: quota.userId._id.toString(),
    name: quota.userId.name,
    email: quota.userId.email,
  },
  pro: {
    id: quota.proId._id.toString(),
    firstName: quota.proId.firstName,
    lastName: quota.proId.lastName,
  },
  bookingId: quota.bookingId.toString(),
  category: {
    id: quota.categoryId._id.toString(),
    name: quota.categoryId.name,
    image: quota.categoryId.image,
  },
  laborCost: quota.laborCost,
  materialCost: quota.materialCost,
  additionalCharges: quota.additionalCharges,
  totalCost: quota.totalCost,
  paymentStatus: quota.paymentStatus,
  paymentIntentId: quota.paymentIntentId,
  createdAt: quota.createdAt,
  updatedAt: quota.updatedAt,
});
