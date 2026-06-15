import type { BookingLocation, BookingStatus, BookingTimeSlot } from "../../contracts/api/bookingTypes";

export interface BookingResponse {
  id: string;
  bookingId: string;
  user: {
    id: string;
    name: string;
    email: string;
    photo?: string;
  };
  pro: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  category: {
    id: string;
    name: string;
    image?: string;
  };
  issueDescription: string;
  location: BookingLocation;
  phoneNumber: string;
  preferredDate: Date;
  preferredTime: BookingTimeSlot[];
  status: BookingStatus;
  rejectedReason?: string;
  cancelReason?: string;
  isRated?: boolean;
  hasComplaintRaisedByPro?: boolean;
  hasComplaintRaisedByUser?: boolean;
  adminRevenue?: number;
  proRevenue?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingCompleteResponse extends Omit<BookingResponse, "pro"> {
  pro: BookingResponse["pro"] & {
    email?: string;
    phoneNumber?: string;
  };
}
