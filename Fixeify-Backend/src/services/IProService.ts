import { ProProfileResponse } from "../dtos/response/proDtos";
import { IPendingPro } from "../models/pendingProModel";
import { UserResponse } from "../dtos/response/userDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";

export interface IAvailability {
  monday?: ITimeSlot[];
  tuesday?: ITimeSlot[];
  wednesday?: ITimeSlot[];
  thursday?: ITimeSlot[];
  friday?: ITimeSlot[];
  saturday?: ITimeSlot[];
  sunday?: ITimeSlot[];
}

export interface ITimeSlot {
  startTime: string;
  endTime: string;
}

export interface IProService {
  applyPro(proData: Partial<IPendingPro>): Promise<{ message: string; pendingPro: IPendingPro }>;
  getProfile(proId: string): Promise<ProProfileResponse>;
  updateProfile(proId: string, data: Partial<ProProfileResponse>): Promise<ProProfileResponse>;
  changePassword(
    proId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<UserResponse | null>;
  getAvailability(proId: string): Promise<{ availability: IAvailability; isUnavailable: boolean }>;
  updateAvailability(proId: string, data: { availability: IAvailability; isUnavailable: boolean }): Promise<{ availability: IAvailability; isUnavailable: boolean }>;
  getAllCategories(): Promise<CategoryResponse[]>;
  fetchProBookings(proId: string): Promise<BookingResponse[]>;
}