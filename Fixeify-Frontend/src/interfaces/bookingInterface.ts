import { ILocation, ITimeSlot } from "./adminInterface";

export class BookingResponse {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  pro: {
    id: string;
    firstName: string;
    lastName: string;
  };
  category: {
    id: string;
    name: string;
    image?: string;
  };
  issueDescription: string;
  location: ILocation;
  phoneNumber: string;
  preferredDate: Date;
  preferredTime: ITimeSlot[];
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  rejectedReason?: string;
  cancelReason?: string;
  isRated?: boolean;
  hasComplaintRaisedByPro?: boolean;
  hasComplaintRaisedByUser?: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    user: { id: string; name: string; email: string };
    pro: { id: string; firstName: string; lastName: string };
    category: { id: string; name: string; image?: string };
    issueDescription: string;
    location: ILocation;
    phoneNumber: string;
    preferredDate: Date;
    preferredTime: ITimeSlot[];
    status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
    rejectedReason?: string;
    cancelReason?: string;
    isRated?: boolean;
    hasComplaintRaisedByPro?: boolean;
    hasComplaintRaisedByUser?: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.user = data.user;
    this.pro = data.pro;
    this.category = data.category;
    this.issueDescription = data.issueDescription;
    this.location = data.location;
    this.phoneNumber = data.phoneNumber;
    this.preferredDate = data.preferredDate;
    this.preferredTime = data.preferredTime;
    this.status = data.status;
    this.rejectedReason = data.rejectedReason;
    this.cancelReason = data.cancelReason;
    this.isRated = data.isRated;
    this.hasComplaintRaisedByPro = data.hasComplaintRaisedByPro ?? false;
    this.hasComplaintRaisedByUser = data.hasComplaintRaisedByUser ?? false;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class BookingCompleteResponse {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNo?: string;
    photo?: string;
  };
  pro: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
    email?: string;
    phoneNumber?: string;
  };
  category: {
    id: string;
    name: string;
    image?: string;
  };
  issueDescription: string;
  location: ILocation;
  phoneNumber: string;
  preferredDate: Date;
  preferredTime: ITimeSlot[];
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  rejectedReason?: string;
  cancelReason?: string;
  isRated?: boolean;
  hasComplaintRaisedByPro?: boolean;
  hasComplaintRaisedByUser?: boolean;
  adminRevenue?: number;
  proRevenue?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    user: { id: string; name: string; email: string; phoneNo?: string; photo?: string };
    pro: { id: string; firstName: string; lastName: string; profilePhoto?: string; email?: string; phoneNumber?: string };
    category: { id: string; name: string; image?: string };
    issueDescription: string;
    location: ILocation;
    phoneNumber: string;
    preferredDate: Date;
    preferredTime: ITimeSlot[];
    status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
    rejectedReason?: string;
    cancelReason?: string;
    isRated?: boolean;
    hasComplaintRaisedByPro?: boolean;
    hasComplaintRaisedByUser?: boolean;
    adminRevenue?: number;
    proRevenue?: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.user = data.user;
    this.pro = data.pro;
    this.category = data.category;
    this.issueDescription = data.issueDescription;
    this.location = data.location;
    this.phoneNumber = data.phoneNumber;
    this.preferredDate = data.preferredDate;
    this.preferredTime = data.preferredTime;
    this.status = data.status;
    this.rejectedReason = data.rejectedReason;
    this.cancelReason = data.cancelReason;
    this.isRated = data.isRated;
    this.hasComplaintRaisedByPro = data.hasComplaintRaisedByPro ?? false;
    this.hasComplaintRaisedByUser = data.hasComplaintRaisedByUser ?? false;
    this.adminRevenue = data.adminRevenue;
    this.proRevenue = data.proRevenue;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}