import type { UserRegistrationRequest } from "../dtos/request/userDtos";
import type { UserResponse } from "../dtos/response/userDtos";
import { UserRole } from "../enums/roleEnum";
import type { IAdmin } from "../models/adminModel";
import type { ApprovedProDocument } from "../models/approvedProModel";
import type { IUser } from "../models/userModel";
import type { CreateUserData } from "../repositories/IUserRepository";

export const toCreateUserData = (dto: UserRegistrationRequest): CreateUserData => ({
  name: dto.name,
  email: dto.email,
  password: dto.password,
});

export const toUserResponse = (user: IUser): UserResponse => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: UserRole.USER,
  photo: user.photo ?? null,
  phoneNo: user.phoneNo ?? null,
  address: user.address
    ? {
        address: user.address.address,
        city: user.address.city,
        state: user.address.state,
        coordinates: user.address.coordinates,
    }
    : null,
  isBanned: user.isBanned,
});

export const toUserProfileResponse = (user: IUser): UserResponse =>
  toUserResponse(user);

export const toAdminUserListResponse = (user: IUser): UserResponse => ({
  ...toUserResponse(user),
  createdAt: user.createdAt,
});

export const toGoogleUserResponse = (user: IUser): UserResponse => ({
  ...toUserResponse(user),
  photo: null,
});

export const toAdminUserResponse = (admin: IAdmin): UserResponse => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  role: UserRole.ADMIN,
  photo: null,
  phoneNo: null,
  address: null,
  isBanned: false,
});

export const toProUserResponse = (
  pro: ApprovedProDocument
): UserResponse => ({
  id: pro.id,
  name: `${pro.firstName} ${pro.lastName}`.trim(),
  email: pro.email,
  role: UserRole.PRO,
  photo: pro.profilePhoto ?? null,
  phoneNo: pro.phoneNumber ?? null,
  address: pro.location
    ? {
        address: pro.location.address,
        city: pro.location.city,
        state: pro.location.state,
        coordinates: pro.location.coordinates,
      }
    : null,
  isBanned: pro.isBanned,
});

export const toAccountUserResponse = (
  account: IUser | IAdmin | ApprovedProDocument
): UserResponse => {
  if ("firstName" in account) {
    return toProUserResponse(account);
  }

  if ("isBanned" in account) {
    return toUserResponse(account);
  }

  return toAdminUserResponse(account);
};
