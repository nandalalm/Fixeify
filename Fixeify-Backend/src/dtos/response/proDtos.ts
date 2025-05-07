import { UserRole } from "../../enums/roleEnum";

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

interface TimeSlot {
  startTime: string;
  endTime: string;
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
  availability: {
    monday?: TimeSlot[];
    tuesday?: TimeSlot[];
    wednesday?: TimeSlot[];
    thursday?: TimeSlot[];
    friday?: TimeSlot[];
    saturday?: TimeSlot[];
    sunday?: TimeSlot[];
  };
  createdAt?: Date;
}

export class ProResponse {
  public _id: string;
  public firstName: string;
  public role: UserRole;
  public lastName: string;
  public email: string;
  public phoneNumber: string;
  public category: ICategory;
  public customService: string | null;
  public location: ILocation;
  public profilePhoto: string;
  public idProof: string[];
  public accountHolderName: string;
  public accountNumber: string;
  public bankName: string;
  public availability: {
    monday?: TimeSlot[];
    tuesday?: TimeSlot[];
    wednesday?: TimeSlot[];
    thursday?: TimeSlot[];
    friday?: TimeSlot[];
    saturday?: TimeSlot[];
    sunday?: TimeSlot[];
  };
  public isBanned: boolean;
  public about: string | null;
  public isBooked: boolean;
  public isUnavailable: boolean;

  constructor({
    _id,
    firstName,
    role,
    lastName,
    email,
    phoneNumber,
    category,
    customService = null,
    location,
    profilePhoto,
    idProof,
    accountHolderName,
    accountNumber,
    bankName,
    availability,
    isBanned,
    about = null,
    isBooked,
    isUnavailable = false,
  }: {
    _id: string;
    firstName: string;
    role: UserRole;
    lastName: string;
    email: string;
    phoneNumber: string;
    category: ICategory;
    customService?: string | null;
    location: ILocation;
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
  }) {
    this._id = _id;
    this.firstName = firstName;
    this.role = role;
    this.lastName = lastName;
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.category = category;
    this.customService = customService;
    this.location = location;
    this.profilePhoto = profilePhoto;
    this.idProof = idProof;
    this.accountHolderName = accountHolderName;
    this.accountNumber = accountNumber;
    this.bankName = bankName;
    this.availability = availability;
    this.isBanned = isBanned;
    this.about = about;
    this.isBooked = isBooked;
    this.isUnavailable = isUnavailable;
  }
}

export class ProProfileResponse {
  public _id: string;
  public firstName: string;
  public lastName: string;
  public email: string;
  public phoneNumber: string;
  public location: ILocation;
  public profilePhoto: string;
  public about: string | null;
  public isBanned: boolean;
  public isUnavailable: boolean;

  constructor({
    _id,
    firstName,
    lastName,
    email,
    phoneNumber,
    location,
    profilePhoto,
    about = null,
    isBanned,
    isUnavailable = false,
  }: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    location: ILocation;
    profilePhoto: string;
    about?: string | null;
    isBanned: boolean;
    isUnavailable: boolean;
  }) {
    this._id = _id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.location = location;
    this.profilePhoto = profilePhoto;
    this.about = about;
    this.isBanned = isBanned;
    this.isUnavailable = isUnavailable;
  }
}