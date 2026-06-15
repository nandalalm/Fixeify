import type { UserRole } from "../../enums/roleEnum";

export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface ICategory {
  id: string;
  name: string;
  image: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  booked: boolean;
}

export interface WeeklyAvailability {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface PendingProResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  category: ICategory;
  customService?: string;
  location: ILocation;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: WeeklyAvailability;
  createdAt?: Date;
  isRejected?: boolean;
}

export interface ProResponse {
  _id: string;
  firstName: string;
  role: UserRole;
  lastName: string;
  email: string;
  phoneNumber: string;
  category: ICategory;
  customService: string | null;
  location: ILocation;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: WeeklyAvailability;
  isBanned: boolean;
  about: string | null;
  isUnavailable: boolean;
  averageRating?: number;
  totalRatings?: number;
}

export interface ProProfileResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: ILocation;
  profilePhoto: string;
  about: string | null;
  isBanned: boolean;
  isUnavailable: boolean;
}
