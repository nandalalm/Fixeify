import type { Types } from "mongoose";
import type { ApprovedProDocument, ITimeSlot } from "../../models/approvedProModel";
import type { CategoryDocument } from "../../models/categoryModel";
import type { IAvailability, ILocation, PendingProDocument } from "../../models/pendingProModel";

export type PopulatedApprovedProRecord = Omit<ApprovedProDocument, "categoryId"> & {
  categoryId: CategoryDocument;
};

export type ProProfileRecord = ApprovedProDocument;

export interface PendingProWithCategoryRecord {
  pro: PendingProDocument;
  category: CategoryDocument;
}

export interface NearbyProCategoryRecord {
  _id: Types.ObjectId;
  name: string;
  image?: string;
}

export interface NearbyProRecord {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  category: NearbyProCategoryRecord;
  customService?: string;
  location: ILocation;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: IAvailability;
  isBanned: boolean;
  about?: string | null;
  isUnavailable: boolean;
  averageRating?: number;
  totalRatings?: number;
  distance?: number;
}

export interface ApprovedProResponseSource {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  categoryId: Types.ObjectId;
  customService?: string;
  location: ILocation;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: {
    monday?: ITimeSlot[];
    tuesday?: ITimeSlot[];
    wednesday?: ITimeSlot[];
    thursday?: ITimeSlot[];
    friday?: ITimeSlot[];
    saturday?: ITimeSlot[];
    sunday?: ITimeSlot[];
  };
  isBanned: boolean;
  about?: string | null;
  isUnavailable: boolean;
}
