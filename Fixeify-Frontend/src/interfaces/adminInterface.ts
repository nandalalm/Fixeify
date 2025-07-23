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

export interface ITimeSlot {
  startTime: string;
  endTime: string;
  booked: boolean;
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
    monday?: ITimeSlot[];
    tuesday?: ITimeSlot[];
    wednesday?: ITimeSlot[];
    thursday?: ITimeSlot[];
    friday?: ITimeSlot[];
    saturday?: ITimeSlot[];
    sunday?: ITimeSlot[];
  };
  createdAt: Date;
  isRejected?: boolean;
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

export interface BanStatusResponse {
  isBanned: boolean;
}