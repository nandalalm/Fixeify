import type { PendingProResponse, ProProfileResponse, ProResponse } from "../dtos/response/proDtos";
import { UserRole } from "../enums/roleEnum";
import type { ApprovedProDocument } from "../models/approvedProModel";
import type { CategoryDocument } from "../models/categoryModel";
import type { IAvailability, PendingProDocument } from "../models/pendingProModel";
import type { NearbyProRecord, PopulatedApprovedProRecord, ProProfileRecord } from "../contracts/repository/proRecords";

const toAvailabilityResponse = (availability: IAvailability) => ({
  monday: availability.monday || [],
  tuesday: availability.tuesday || [],
  wednesday: availability.wednesday || [],
  thursday: availability.thursday || [],
  friday: availability.friday || [],
  saturday: availability.saturday || [],
  sunday: availability.sunday || [],
});

export const toProResponse = (
  pro: ApprovedProDocument,
  category: CategoryDocument
): ProResponse => ({
  _id: pro._id.toString(),
  firstName: pro.firstName,
  role: UserRole.PRO,
  lastName: pro.lastName,
  email: pro.email,
  phoneNumber: pro.phoneNumber,
  category: {
    id: category.id,
    name: category.name,
    image: category.image || "",
  },
  customService: pro.customService ?? null,
  location: {
    address: pro.location.address,
    city: pro.location.city,
    state: pro.location.state,
    coordinates: pro.location.coordinates,
  },
  profilePhoto: pro.profilePhoto,
  idProof: pro.idProof,
  accountHolderName: pro.accountHolderName,
  accountNumber: pro.accountNumber,
  bankName: pro.bankName,
  availability: toAvailabilityResponse(pro.availability),
  isBanned: pro.isBanned,
  about: pro.about ?? null,
  isUnavailable: pro.isUnavailable,
});

export const toPopulatedProResponse = (
  pro: PopulatedApprovedProRecord
): ProResponse => ({
  _id: pro._id.toString(),
  firstName: pro.firstName,
  role: UserRole.PRO,
  lastName: pro.lastName,
  email: pro.email,
  phoneNumber: pro.phoneNumber,
  category: {
    id: pro.categoryId.id,
    name: pro.categoryId.name,
    image: pro.categoryId.image || "",
  },
  customService: pro.customService ?? null,
  location: {
    address: pro.location.address,
    city: pro.location.city,
    state: pro.location.state,
    coordinates: pro.location.coordinates,
  },
  profilePhoto: pro.profilePhoto,
  idProof: pro.idProof,
  accountHolderName: pro.accountHolderName,
  accountNumber: pro.accountNumber,
  bankName: pro.bankName,
  availability: toAvailabilityResponse(pro.availability),
  isBanned: pro.isBanned,
  about: pro.about ?? null,
  isUnavailable: pro.isUnavailable,
});

export const toNearbyProResponse = (pro: NearbyProRecord): ProResponse => ({
  _id: pro._id.toString(),
  firstName: pro.firstName,
  role: UserRole.PRO,
  lastName: pro.lastName,
  email: pro.email,
  phoneNumber: pro.phoneNumber,
  category: {
    id: pro.category._id.toString(),
    name: pro.category.name,
    image: pro.category.image || "",
  },
  customService: pro.customService ?? null,
  location: {
    address: pro.location.address,
    city: pro.location.city,
    state: pro.location.state,
    coordinates: pro.location.coordinates,
  },
  profilePhoto: pro.profilePhoto,
  idProof: pro.idProof,
  accountHolderName: pro.accountHolderName,
  accountNumber: pro.accountNumber,
  bankName: pro.bankName,
  availability: toAvailabilityResponse(pro.availability),
  isBanned: pro.isBanned,
  about: pro.about ?? null,
  isUnavailable: pro.isUnavailable,
  averageRating: pro.averageRating || 0,
  totalRatings: pro.totalRatings || 0,
});

export const toProProfileResponse = (
  pro: ProProfileRecord
): ProProfileResponse => ({
  _id: pro._id.toString(),
  firstName: pro.firstName,
  lastName: pro.lastName,
  email: pro.email,
  phoneNumber: pro.phoneNumber,
  location: {
    address: pro.location.address,
    city: pro.location.city,
    state: pro.location.state,
    coordinates: pro.location.coordinates,
  },
  profilePhoto: pro.profilePhoto,
  about: pro.about ?? null,
  isBanned: pro.isBanned,
  isUnavailable: pro.isUnavailable,
});

export const toPendingProResponse = (
  pro: PendingProDocument,
  category: CategoryDocument
): PendingProResponse => ({
  _id: pro._id.toString(),
  firstName: pro.firstName,
  lastName: pro.lastName,
  email: pro.email,
  phoneNumber: pro.phoneNumber,
  category: {
    id: category.id,
    name: category.name,
    image: category.image || "",
  },
  customService: pro.customService,
  location: pro.location,
  profilePhoto: pro.profilePhoto,
  idProof: pro.idProof,
  accountHolderName: pro.accountHolderName,
  accountNumber: pro.accountNumber,
  bankName: pro.bankName,
  availability: pro.availability,
  createdAt: pro.createdAt,
  isRejected: pro.isRejected,
});
