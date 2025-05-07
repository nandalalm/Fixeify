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

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNo?: string | null;
  address?: ILocation | null;
  isBanned: boolean;
  photo?: string | null;
}

export interface LocationData {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface PendingPro {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  category: ICategory;
  customService?: string;
  location: LocationData;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: {
    monday?: TimeSlot[];
    tuesday?: TimeSlot[];
    wednesday?: TimeSlot[];
    thursday?: TimeSlot[];
    friday?: TimeSlot[];
    saturday?: TimeSlot[];
    sunday?: TimeSlot[];
  };
  createdAt: Date;
}
export interface IApprovedPro {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  category: ICategory;
  customService?: string | null;
  location: LocationData;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: {
    monday?: TimeSlot[];
    tuesday?: TimeSlot[];
    wednesday?: TimeSlot[];
    thursday?: TimeSlot[];
    friday?: TimeSlot[];
    saturday?: TimeSlot[];
    sunday?: TimeSlot[];
  };
  isBanned: boolean;
  about?: string | null;
  isBooked: boolean;
  isUnavailable: boolean;
}

export interface BanStatusResponse {
  isBanned: boolean;
}