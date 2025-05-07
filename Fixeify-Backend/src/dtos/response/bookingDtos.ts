export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

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
  preferredTime: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  rejectedReason?: string;
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
    preferredTime: string;
    status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
    rejectedReason?: string;
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
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}