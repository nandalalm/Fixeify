import { UserRole } from "../../enums/roleEnum";

// dtos/response/proDtos.ts
export class ProResponse {
  public _id: string; // Change id to _id to match Mongoose
  public firstName: string;
  public role: UserRole;
  public lastName: string;
  public email: string;
  public phoneNumber: string;
  public serviceType: string;
  public customService: string | null;
  public skills: string[];
  public location: string;
  public profilePhoto: string;
  public idProof: string[];
  public accountHolderName: string;
  public accountNumber: string;
  public bankName: string;
  public availability: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  public workingHours: string;
  public isBanned: boolean;
  public about: string | null;

  constructor({
    _id, // Use _id instead of id
    firstName,
    role,
    lastName,
    email,
    phoneNumber,
    serviceType,
    customService = null,
    skills,
    location,
    profilePhoto,
    idProof,
    accountHolderName,
    accountNumber,
    bankName,
    availability,
    workingHours,
    isBanned,
    about = null,
  }: {
    _id: string;
    firstName: string;
    role: UserRole;
    lastName: string;
    email: string;
    phoneNumber: string;
    serviceType: string;
    customService?: string | null;
    skills: string[];
    location: string;
    profilePhoto: string;
    idProof: string[];
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    availability: {
      monday: boolean;
      tuesday: boolean;
      wednesday: boolean;
      thursday: boolean;
      friday: boolean;
      saturday: boolean;
      sunday: boolean;
    };
    workingHours: string;
    isBanned: boolean;
    about?: string | null;
  }) {
    this._id = _id;
    this.firstName = firstName;
    this.role = role;
    this.lastName = lastName;
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.serviceType = serviceType;
    this.customService = customService;
    this.skills = skills;
    this.location = location;
    this.profilePhoto = profilePhoto;
    this.idProof = idProof;
    this.accountHolderName = accountHolderName;
    this.accountNumber = accountNumber;
    this.bankName = bankName;
    this.availability = availability;
    this.workingHours = workingHours;
    this.isBanned = isBanned;
    this.about = about;
  }
}